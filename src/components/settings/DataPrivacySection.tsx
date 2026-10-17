'use client';

import React, { useState } from 'react';
import styles from './DataPrivacySection.module.css';

export interface DataPrivacySectionProps {
  onExportTelemetry: (format: 'json' | 'csv') => void;
  onDownloadBackup: () => void;
  onClearCache: () => void;
  onResetHistory: () => void;
  onDeleteAccount: () => void;
}

export function DataPrivacySection({
  onExportTelemetry,
  onDownloadBackup,
  onClearCache,
  onResetHistory,
  onDeleteAccount
}: DataPrivacySectionProps) {
  const [cacheCleared, setCacheCleared] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleClear = () => {
    onClearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <section id="data-privacy" className={styles.section} aria-labelledby="privacy-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🛡</span>
          <h2 id="privacy-heading" className={styles.title}>Data Sovereignty &amp; Danger Zone</h2>
        </div>
        <span className={styles.privilegeBadge}>HIGH PRIVILEGE</span>
      </div>

      {/* Export & Backup Cards */}
      <div className={styles.actionsGrid}>
        {/* Export Telemetry */}
        <div className={styles.actionCard}>
          <div className={styles.actionDetails}>
            <span className={styles.actionTitle}>Export Learning Telemetry</span>
            <p className={styles.actionDesc}>
              Download complete study heatmaps, flashcard SRS history, and session timestamps in JSON or CSV.
            </p>
          </div>
          <div className={styles.exportBtnGroup}>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => onExportTelemetry('json')}
            >
              ⬇ Export Telemetry (.JSON)
            </button>
            <button
              type="button"
              className={styles.exportBtnAlt}
              onClick={() => onExportTelemetry('csv')}
            >
              CSV
            </button>
          </div>
        </div>

        {/* Encrypted Backup Vault */}
        <div className={styles.actionCard}>
          <div className={styles.actionDetails}>
            <span className={styles.actionTitle}>Encrypted Backup Vault</span>
            <p className={styles.actionDesc}>
              Package all roadmaps, private annotations, and AI conversation history in an encrypted file.
            </p>
          </div>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={onDownloadBackup}
          >
            🔒 Download Encrypted Backup
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className={styles.dangerZone}>
        <div className={styles.dangerHeader}>
          <span className={styles.dangerIcon}>⚠️</span>
          <span className={styles.dangerTitle}>DANGER ZONE</span>
        </div>

        <div className={styles.dangerList}>
          {/* Row 1: Purge Offline Media & Cache */}
          <div className={styles.dangerRow}>
            <div className={styles.dangerText}>
              <span className={styles.dangerItemTitle}>Purge Offline Media &amp; Cache</span>
              <p className={styles.dangerItemDesc}>
                Frees disk space by wiping buffered video segments and temporary OCR frames.
              </p>
            </div>
            <button
              type="button"
              className={styles.clearCacheBtn}
              onClick={handleClear}
            >
              {cacheCleared ? 'Cache Cleared (0 MB)' : 'Clear Cache (1.2 GB)'}
            </button>
          </div>

          {/* Row 2: Reset Flashcard & Roadmap History */}
          <div className={styles.dangerRow}>
            <div className={styles.dangerText}>
              <span className={styles.dangerItemTitle}>Reset Flashcard &amp; Roadmap History</span>
              <p className={styles.dangerItemDesc}>
                Resets retention curves and Leitner buckets to zero across all skills.
              </p>
            </div>
            {showConfirmReset ? (
              <div className={styles.confirmRow}>
                <span className={styles.confirmPrompt}>Are you sure?</span>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={() => {
                    onResetHistory();
                    setShowConfirmReset(false);
                  }}
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  className={styles.cancelConfirmBtn}
                  onClick={() => setShowConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.resetHistoryBtn}
                onClick={() => setShowConfirmReset(true)}
              >
                Reset Learning History
              </button>
            )}
          </div>

          {/* Row 3: Permanently Delete Account */}
          <div className={styles.dangerRow}>
            <div className={styles.dangerText}>
              <span className={styles.dangerItemTitle}>Permanently Delete Account</span>
              <p className={styles.dangerItemDesc}>
                Immediate cryptographic erasure of all server tokens and local storage nodes.
              </p>
            </div>
            {showConfirmDelete ? (
              <div className={styles.confirmRow}>
                <span className={styles.confirmPrompt}>Permanently delete all data?</span>
                <button
                  type="button"
                  className={styles.deleteAccountBtn}
                  onClick={() => {
                    onDeleteAccount();
                    setShowConfirmDelete(false);
                  }}
                >
                  Confirm Deletion
                </button>
                <button
                  type="button"
                  className={styles.cancelConfirmBtn}
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.deleteAccountBtn}
                onClick={() => setShowConfirmDelete(true)}
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
