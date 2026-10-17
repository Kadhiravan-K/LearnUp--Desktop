export interface SyncErrorEvent {
  entityType: string;
  error: string;
  timestamp: string;
  mutationId: string;
}

export interface SyncDiagnostics {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  failedCount: number;
  lastSyncTimestamp: string | null;
  activeAccountScope: string;
  recentErrors?: SyncErrorEvent[];
}
