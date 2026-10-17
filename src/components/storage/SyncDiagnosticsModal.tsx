'use client';

import React, { useState } from 'react';
import styles from './SyncDiagnosticsModal.module.css';
import { SyncDiagnostics } from '@/lib/storage/contracts';

interface SyncDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: SyncDiagnostics;
  onManualSync: () => Promise<void>;
}

export function SyncDiagnosticsModal({
  isOpen,
  onClose,
  diagnostics,
  onManualSync
}: SyncDiagnosticsModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onManualSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="diag-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 id="diag-title" className={styles.title}>
            <span>📡</span>
            <span>Storage &amp; Sync Diagnostics</span>
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close sync diagnostics"
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Connection State</div>
              <div className={`${styles.metricValue} ${diagnostics.isOnline ? styles.statusOnline : styles.statusOffline}`}>
                {diagnostics.isOnline ? '🟢 Online' : '🟠 Offline Mode'}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Pending Journal Mutations</div>
              <div className={styles.metricValue}>
                {diagnostics.pendingCount}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Last Successful Cloud Sync</div>
              <div className={styles.metricValue} style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {diagnostics.lastSyncTimestamp
                  ? new Date(diagnostics.lastSyncTimestamp).toLocaleTimeString()
                  : 'Not synced yet'}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Account Scope</div>
              <div
                className={styles.metricValue}
                style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}
              >
                {diagnostics.activeAccountScope}
              </div>
            </div>
          </div>

          <h4 className={styles.sectionHeading}>Recent Sync Events &amp; Anomalies</h4>
          {(!diagnostics.recentErrors || diagnostics.recentErrors.length === 0) ? (
            <p style={{ color: '#10b981', fontSize: '0.875rem', margin: 0 }}>
              ✓ All local mutations acknowledged. No sync conflicts or failures detected.
            </p>
          ) : (
            <div className={styles.errorList}>
              {(diagnostics.recentErrors || []).map((err, idx) => (
                <div key={idx} className={styles.errorItem}>
                  <strong>[{err.entityType.toUpperCase()}]</strong> {err.error}
                  <span style={{ display: 'block', fontSize: '0.6875rem', color: '#64748b' }}>
                    {new Date(err.timestamp).toLocaleTimeString()} (Mutation: {err.mutationId.substring(0, 12)}...)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Zero-LWW Revision Safe
          </span>
          <button
            type="button"
            className={styles.syncBtn}
            onClick={handleSyncClick}
            disabled={isSyncing || !diagnostics.isOnline}
          >
            {isSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
