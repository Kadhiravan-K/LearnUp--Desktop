'use client';

import React, { useState, useEffect } from 'react';
import styles from './YouTubeImportLoader.module.css';

export interface YouTubeImportLoaderProps {
  message?: string;
  subMessage?: string;
}

const DEFAULT_STAGES = [
  'Resolving YouTube metadata & syllabus structure...',
  'Extracting video chapters, durations & lecture nodes...',
  'Structuring curriculum index & syllabus preview...'
];

export function YouTubeImportLoader({
  message,
  subMessage
}: YouTubeImportLoaderProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % DEFAULT_STAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const activeMessage = message || DEFAULT_STAGES[stageIndex];
  const activeSub = subMessage || 'LearnUp Curriculum Ingestion Engine';

  return (
    <div
      className={styles.loaderContainer}
      role="status"
      aria-live="polite"
      aria-label="Ingesting YouTube curriculum"
    >
      <div className={styles.orbWrapper}>
        <div className={styles.pulseRing} />
        <div className={styles.pulseRingSecondary} />
        <div className={styles.spinnerOrb}>
          <span className={styles.iconInside}>⚡</span>
        </div>
      </div>

      <div className={styles.textGroup}>
        <h4 className={styles.title}>{activeMessage}</h4>
        <p className={styles.subtitle}>{activeSub}</p>
      </div>

      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarIndeterminate} />
      </div>
    </div>
  );
}
