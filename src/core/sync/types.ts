/**
 * LearnUp Shared Core — Offline-to-Cloud Sync Contracts
 * Defines types for the durable mutation journal, transport adapters,
 * conflict resolution strategies, and diagnostics.
 */

import { MutationEntity, MutationJournalEntry } from '../types';

export type ConflictStrategy =
  | 'fork_conflict_copy'   // Preserves server version and creates a dated local copy (default for notes)
  | 'client_wins'          // Overwrite server with client state
  | 'server_wins'          // Discard local edits and accept server state
  | 'highest_timestamp'    // Take the version with the latest updatedAt
  | 'highest_numeric';     // Take the maximum value (e.g. video position seconds)

export interface ConflictResolution<T> {
  resolvedRecord: T;
  forkedRecord?: T;
  strategy: ConflictStrategy;
  conflictDescription: string;
}

export interface SyncTransportResult<T = unknown> {
  success: boolean;
  acknowledged: boolean;
  data?: T;
  conflict?: {
    serverVersion: number;
    serverRecord: T;
    serverUpdatedAt: string;
  };
  error?: {
    category: 'network' | 'conflict' | 'auth' | 'validation' | 'server' | 'unknown';
    message: string;
    isRetryable: boolean;
    statusCode?: number;
  };
}

export interface ISyncTransport {
  readonly transportName: string;
  isOnline(): Promise<boolean>;
  syncMutation(mutation: MutationJournalEntry, authToken?: string): Promise<SyncTransportResult>;
}

export interface SyncDiagnostics {
  isOnline: boolean;
  isSyncing: boolean;
  isPaused: boolean;
  pendingCount: number;
  inFlightCount: number;
  conflictCount: number;
  failedCount: number;
  lastSyncTimestamp: string | null;
  activeAccountScope: string;
  cloudUserId: string | null;
  cloudUserEmail: string | null;
  isCloudLinked: boolean;
  recentErrors: Array<{
    mutationId: string;
    entityType: MutationEntity;
    error: string;
    category: string;
    timestamp: string;
  }>;
}

export interface AccountLinkPreview {
  profileId: string;
  profileName: string;
  cloudUserId: string;
  cloudUserEmail: string;
  notesCount: number;
  coursesCount: number;
  progressCount: number;
  pendingMutationsCount: number;
}
