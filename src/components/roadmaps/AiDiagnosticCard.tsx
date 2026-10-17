'use client';

import React, { useState } from 'react';
import styles from './AiDiagnosticCard.module.css';

export interface AiDiagnosticCardProps {
  onInsertMicroDrill?: () => void;
}

export function AiDiagnosticCard({ onInsertMicroDrill }: AiDiagnosticCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [inserted, setInserted] = useState(false);

  if (dismissed) return null;

  const handleInsert = () => {
    if (onInsertMicroDrill) {
      onInsertMicroDrill();
    }
    setInserted(true);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>💡</span>
        <h4 className={styles.title}>AI Tutor Diagnostic Insight</h4>
      </div>

      <p className={styles.bodyText}>
        Your quiz telemetry on <strong>Node 04 (SPI Bus Multi-master)</strong> indicated minor uncertainty around clock polarity (CPOL) and phase (CPHA). Would you like to add an optional 45-min micro-drill milestone before starting CAN Bus?
      </p>

      {inserted ? (
        <div className={styles.successMessage}>
          ✓ Micro-drill milestone inserted into sequence!
        </div>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.insertBtn}
            onClick={handleInsert}
          >
            <span>➕</span>
            <span>Insert Micro-Drill</span>
          </button>

          <button
            type="button"
            className={styles.dismissBtn}
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
