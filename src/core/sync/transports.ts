/**
 * LearnUp Shared Core — Sync Transports
 * Provides MockSyncTransport for safe offline/test verification and
 * SupabaseSyncTransport for user-authorized cloud synchronization.
 */

import { MutationJournalEntry } from '../types';
import { ISyncTransport, SyncTransportResult } from './types';

/**
 * MockSyncTransport for isolated testing, deterministic conflict simulation,
 * and zero-network verification.
 */
export class MockSyncTransport implements ISyncTransport {
  public readonly transportName = 'MockSyncTransport';
  private online = true;
  private failNextCount = 0;
  private conflictNextCount = 0;
  private latencyMs = 0;
  private simulateAuthFailure = false;
  private serverStore = new Map<string, { version: number; payload: Record<string, unknown>; updatedAt: string }>();

  public setOnline(online: boolean): void {
    this.online = online;
  }

  public setNetworkLatencyMs(ms: number): void {
    this.latencyMs = ms;
  }

  public setSimulateNetworkFailure(fail: boolean): void {
    this.failNextCount = fail ? 999999 : 0;
  }

  public setSimulateAuthFailure(fail: boolean): void {
    this.simulateAuthFailure = fail;
  }

  public setSimulateConflict(conflict: boolean): void {
    this.conflictNextCount = conflict ? 999999 : 0;
  }

  public injectFailures(count: number): void {
    this.failNextCount = count;
  }

  public injectConflict(count: number): void {
    this.conflictNextCount = count;
  }

  public setServerRecord(entityType: string, entityId: string, record: Record<string, unknown>, version = 1): void {
    this.seedServerRecord(entityType, entityId, version, record);
  }

  public seedServerRecord(entityType: string, entityId: string, version: number, payload: Record<string, unknown>): void {
    const key = `${entityType}:${entityId}`;
    this.serverStore.set(key, {
      version,
      payload,
      updatedAt: new Date().toISOString()
    });
  }

  public getServerRecord(entityType: string, entityId: string) {
    return this.serverStore.get(`${entityType}:${entityId}`);
  }

  public async isOnline(): Promise<boolean> {
    return this.online;
  }

  public async syncMutation(mutation: MutationJournalEntry, authToken?: string): Promise<SyncTransportResult> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs));
    }

    if (!this.online) {
      return {
        success: false,
        acknowledged: false,
        error: {
          category: 'network',
          message: 'Network connection is currently unavailable.',
          isRetryable: true
        }
      };
    }

    if (this.simulateAuthFailure) {
      return {
        success: false,
        acknowledged: false,
        error: {
          category: 'auth',
          message: 'Invalid authentication credentials or expired JWT token.',
          isRetryable: false,
          statusCode: 401
        }
      };
    }

    if (this.failNextCount > 0) {
      this.failNextCount--;
      return {
        success: false,
        acknowledged: false,
        error: {
          category: 'server',
          message: 'Simulated 503 Service Unavailable.',
          isRetryable: true,
          statusCode: 503
        }
      };
    }

    // Require user token when cloud sync is linked
    if (mutation.cloudUserId && !authToken) {
      return {
        success: false,
        acknowledged: false,
        error: {
          category: 'auth',
          message: 'Missing authenticated user token for cloud synchronization.',
          isRetryable: false,
          statusCode: 401
        }
      };
    }

    const key = `${mutation.entityType}:${mutation.entityId}`;
    const remote = this.serverStore.get(key);

    // Conflict generation or detection
    if (this.conflictNextCount > 0 || (remote && remote.version > mutation.baseVersion)) {
      if (this.conflictNextCount > 0) this.conflictNextCount--;
      const serverVersion = remote ? remote.version : mutation.baseVersion + 1;
      const serverRecord = remote ? remote.payload : { ...mutation.payload, content: 'Remote server conflicting content' };
      return {
        success: false,
        acknowledged: false,
        conflict: {
          serverVersion,
          serverRecord,
          serverUpdatedAt: remote?.updatedAt || new Date().toISOString()
        },
        error: {
          category: 'conflict',
          message: `Version conflict: local base version ${mutation.baseVersion} is behind server version ${serverVersion}.`,
          isRetryable: false,
          statusCode: 409
        }
      };
    }

    // Process operation
    if (mutation.operation === 'DELETE') {
      this.serverStore.delete(key);
      return {
        success: true,
        acknowledged: true,
        data: { id: mutation.entityId, deleted: true }
      };
    }

    // CREATE or UPDATE
    const newVersion = Math.max((remote?.version || 0) + 1, mutation.localVersion);
    const updatedPayload = {
      ...mutation.payload,
      version: newVersion,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    };
    this.serverStore.set(key, {
      version: newVersion,
      payload: updatedPayload,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      acknowledged: true,
      data: updatedPayload
    };
  }
}

/**
 * SupabaseSyncTransport communicating with Supabase PostgREST endpoints.
 * Requires user JWT authorization (strictly rejects service-role keys).
 */
export class SupabaseSyncTransport implements ISyncTransport {
  public readonly transportName = 'SupabaseSyncTransport';

  constructor(
    private supabaseUrl: string,
    private anonKey: string
  ) {
    if (!supabaseUrl) throw new Error('Supabase URL is required');
    if (!anonKey) throw new Error('Supabase anon public key is required');
  }

  public async isOnline(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: { apikey: this.anonKey }
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  public async syncMutation(mutation: MutationJournalEntry, authToken?: string): Promise<SyncTransportResult> {
    if (!authToken) {
      return {
        success: false,
        acknowledged: false,
        error: {
          category: 'auth',
          message: 'User authorization required. Sign in with your Supabase account to sync.',
          isRetryable: false,
          statusCode: 401
        }
      };
    }

    // Map local entity type to Supabase table
    let table = '';
    switch (mutation.entityType) {
      case 'note':
        table = 'notes';
        break;
      case 'learning_item':
        table = 'learning_items';
        break;
      case 'progress':
        table = 'video_progress';
        break;
      case 'bookmark':
        table = 'bookmarks';
        break;
      default:
        return {
          success: false,
          acknowledged: false,
          error: {
            category: 'validation',
            message: `Unsupported entity type: ${mutation.entityType}`,
            isRetryable: false
          }
        };
    }

    const endpoint = `${this.supabaseUrl}/rest/v1/${table}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: this.anonKey,
      Authorization: `Bearer ${authToken}`,
      Prefer: 'return=representation'
    };

    try {
      if (mutation.operation === 'DELETE') {
        const res = await fetch(`${endpoint}?id=eq.${mutation.entityId}`, {
          method: 'DELETE',
          headers
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          return {
            success: false,
            acknowledged: false,
            error: {
              category: res.status >= 500 ? 'server' : 'unknown',
              message: `Supabase delete failed (${res.status}): ${body}`,
              isRetryable: res.status >= 500 || res.status === 429,
              statusCode: res.status
            }
          };
        }
        return { success: true, acknowledged: true };
      }

      // Upsert
      headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(mutation.payload)
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 409) {
          return {
            success: false,
            acknowledged: false,
            error: {
              category: 'conflict',
              message: 'Supabase concurrent modification conflict (HTTP 409).',
              isRetryable: false,
              statusCode: 409
            }
          };
        }
        return {
          success: false,
          acknowledged: false,
          error: {
            category: res.status === 401 || res.status === 403 ? 'auth' : res.status >= 500 ? 'server' : 'unknown',
            message: `Supabase sync error (${res.status}): ${body}`,
            isRetryable: res.status >= 500 || res.status === 429,
            statusCode: res.status
          }
        };
      }

      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        acknowledged: true,
        data: Array.isArray(data) ? data[0] : data
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        acknowledged: false,
        error: {
          category: 'network',
          message: `Network transport failure: ${msg}`,
          isRetryable: true
        }
      };
    }
  }
}
