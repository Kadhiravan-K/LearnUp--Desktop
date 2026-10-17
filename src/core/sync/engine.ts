/**
 * LearnUp Shared Core — Offline-to-Cloud Sync Engine
 * Coordinates local mutation queue processing, exponential backoff,
 * conflict resolution with zero data-loss forking, pause/resume, and crash recovery.
 */

import {
  DurableNote,
  DurableProgress,
  IStorageAdapter,
  MutationJournalEntry
} from '../types';
import { calculateBackoffDelayMs } from './journal';
import {
  ISyncTransport,
  SyncDiagnostics,
  SyncTransportResult
} from './types';

export interface SyncEngineConfig {
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

export class SyncEngine {
  private isRunning = false;
  private isPaused = false;
  private maxRetries: number;
  private baseBackoffMs: number;
  private maxBackoffMs: number;
  private lastSyncTimestamp: string | null = null;
  private recentErrors: SyncDiagnostics['recentErrors'] = [];
  private listeners = new Set<(diag: SyncDiagnostics) => void>();

  constructor(
    private storage: IStorageAdapter,
    private transport: ISyncTransport,
    config?: SyncEngineConfig
  ) {
    this.maxRetries = config?.maxRetries ?? 5;
    this.baseBackoffMs = config?.baseBackoffMs ?? 1000;
    this.maxBackoffMs = config?.maxBackoffMs ?? 30000;
  }

  public subscribe(listener: (diag: SyncDiagnostics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public pause(): void {
    this.isPaused = true;
    this.notifyDiagnostics();
  }

  public resume(): void {
    this.isPaused = false;
    this.notifyDiagnostics();
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getLastSyncTimestamp(): string | null {
    return this.lastSyncTimestamp;
  }

  public async recoverInFlightMutations(userId: string): Promise<void> {
    // On engine boot, reset any stuck 'in_flight' mutations back to 'pending'
    const pending = await this.storage.getPendingMutations(userId);
    for (const m of pending) {
      if (m.status === 'in_flight') {
        await this.storage.updateMutationStatus(m.id, 'pending');
      }
    }
  }

  public async syncProfile(
    userId: string,
    authToken?: string
  ): Promise<{
    processed: number;
    conflicts: number;
    failures: number;
  }> {
    if (this.isRunning || this.isPaused) {
      return { processed: 0, conflicts: 0, failures: 0 };
    }

    const online = await this.transport.isOnline();
    if (!online) {
      this.recordError('network', 'note', 'Offline: Device network unavailable', 'network');
      return { processed: 0, conflicts: 0, failures: 0 };
    }

    this.isRunning = true;
    this.notifyDiagnostics();

    let processed = 0;
    let conflicts = 0;
    let failures = 0;

    try {
      const pending = await this.storage.getPendingMutations(userId);

      for (const mutation of pending) {
        if (this.isPaused) break;

        // Check retry limits
        if (mutation.retryCount >= this.maxRetries) {
          await this.storage.updateMutationStatus(
            mutation.id,
            'permanent_failure',
            `Max retries (${this.maxRetries}) exceeded.`
          );
          failures++;
          this.recordError(
            mutation.id,
            mutation.entityType,
            `Max retries exceeded`,
            'validation'
          );
          continue;
        }

        // Mark in-flight
        await this.storage.updateMutationStatus(mutation.id, 'in_flight');

        try {
          const res = await this.transport.syncMutation(mutation, authToken);

          if (res.acknowledged && res.success) {
            // Server acknowledged: safe to delete mutation from queue
            await this.storage.deleteMutation(mutation.id);
            processed++;
            this.lastSyncTimestamp = new Date().toISOString();
          } else if (res.conflict) {
            // Concurrent modification conflict: resolve without data loss
            conflicts++;
            await this.handleConflict(mutation, res);
            // After resolution, remove original mutation
            await this.storage.deleteMutation(mutation.id);
            processed++;
          } else {
            // Error occurred
            failures++;
            const err = res.error || {
              category: 'unknown' as const,
              message: 'Unknown transport rejection',
              isRetryable: true
            };

            this.recordError(mutation.id, mutation.entityType, err.message, err.category);

            if (err.isRetryable) {
              const backoffMs = calculateBackoffDelayMs(mutation.retryCount, this.baseBackoffMs, this.maxBackoffMs);
              await this.storage.updateMutationStatus(
                mutation.id,
                'retryable_failure',
                `${err.message} (backoff: ${backoffMs}ms)`
              );
            } else {
              await this.storage.updateMutationStatus(
                mutation.id,
                'permanent_failure',
                err.message
              );
            }
          }
        } catch (err: unknown) {
          failures++;
          const msg = err instanceof Error ? err.message : String(err);
          this.recordError(mutation.id, mutation.entityType, msg, 'server');
          await this.storage.updateMutationStatus(mutation.id, 'retryable_failure', msg);
        }
      }
    } finally {
      this.isRunning = false;
      this.notifyDiagnostics();
    }

    return { processed, conflicts, failures };
  }

  private async handleConflict(
    mutation: MutationJournalEntry,
    res: SyncTransportResult
  ): Promise<void> {
    const serverRecord = res.conflict?.serverRecord as Record<string, unknown>;

    if (mutation.entityType === 'note') {
      // Zero data loss: accept server copy as primary, fork local version as conflict note
      const localContent = String(mutation.payload.content || '');
      const serverContent = String(serverRecord?.content || '');

      // 1. Update primary note with server state
      const primaryNote: DurableNote = {
        id: mutation.entityId,
        userId: mutation.userId,
        learningItemId: String(mutation.payload.learningItemId || 'general'),
        youtubeVideoId: String(mutation.payload.youtubeVideoId || 'general'),
        content: serverContent,
        createdAt: String(serverRecord?.createdAt || mutation.createdAt),
        updatedAt: String(serverRecord?.updatedAt || new Date().toISOString()),
        version: Number(res.conflict?.serverVersion || mutation.baseVersion + 1),
        syncStatus: 'synced',
        isDeleted: false,
        tombstoneAt: null
      };
      await this.storage.saveNote(primaryNote);

      // 2. Fork local edit into dedicated conflict copy if content differs
      if (localContent.trim() !== serverContent.trim()) {
        const forkedNote: DurableNote = {
          id: `${mutation.entityId}_conflict_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: mutation.userId,
          learningItemId: primaryNote.learningItemId,
          youtubeVideoId: primaryNote.youtubeVideoId,
          content: `${localContent}\n\n[⚠️ Local Conflict Fork — Saved ${new Date().toLocaleTimeString()}]`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          syncStatus: 'saved_locally',
          isDeleted: false,
          tombstoneAt: null
        };
        await this.storage.saveNote(forkedNote);
      }
    } else if (mutation.entityType === 'progress') {
      // Progress conflict: take the highest positionSeconds
      const localPos = Number(mutation.payload.positionSeconds || 0);
      const serverPos = Number(serverRecord?.positionSeconds || 0);
      const resolvedPos = Math.max(localPos, serverPos);

      const resolvedProgress: DurableProgress = {
        id: mutation.entityId,
        userId: mutation.userId,
        youtubeVideoId: String(mutation.payload.youtubeVideoId || ''),
        positionSeconds: resolvedPos,
        durationSeconds: Number(mutation.payload.durationSeconds || null),
        isCompleted: Boolean(mutation.payload.isCompleted || serverRecord?.isCompleted),
        createdAt: String(mutation.payload.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        version: Number(res.conflict?.serverVersion || mutation.baseVersion + 1),
        syncStatus: 'synced',
        isDeleted: false,
        tombstoneAt: null
      };
      await this.storage.saveProgress(resolvedProgress);
    }
  }

  private recordError(
    mutationId: string,
    entityType: MutationJournalEntry['entityType'],
    error: string,
    category: string
  ): void {
    this.recentErrors.unshift({
      mutationId,
      entityType,
      error,
      category,
      timestamp: new Date().toISOString()
    });
    if (this.recentErrors.length > 20) {
      this.recentErrors.pop();
    }
  }

  public async getDiagnostics(userId: string): Promise<SyncDiagnostics> {
    const pending = await this.storage.getPendingMutations(userId).catch(() => []);
    const inFlight = pending.filter((m) => m.status === 'in_flight').length;
    const failed = pending.filter((m) => m.status === 'permanent_failure' || m.status === 'retryable_failure').length;
    const online = await this.transport.isOnline().catch(() => false);

    const activeProfile = await this.storage.getActiveProfile().catch(() => null);

    return {
      isOnline: online,
      isSyncing: this.isRunning,
      isPaused: this.isPaused,
      pendingCount: pending.filter((m) => m.status === 'pending').length,
      inFlightCount: inFlight,
      conflictCount: 0,
      failedCount: failed,
      lastSyncTimestamp: this.lastSyncTimestamp,
      activeAccountScope: userId,
      cloudUserId: activeProfile?.cloudUserId ?? null,
      cloudUserEmail: activeProfile?.cloudUserEmail ?? null,
      isCloudLinked: Boolean(activeProfile?.cloudSyncEnabled),
      recentErrors: [...this.recentErrors]
    };
  }

  private notifyDiagnostics(): void {
    if (this.listeners.size === 0) return;
    this.storage.getActiveProfile().then((prof) => {
      if (prof) {
        this.getDiagnostics(prof.id).then((d) => {
          this.listeners.forEach((l) => l(d));
        });
      }
    });
  }
}
