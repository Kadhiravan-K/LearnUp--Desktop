'use client';

import React from 'react';
import { useFocusTimer } from '@/lib/hooks/useFocusTimer';
import styles from './FocusEngineWidget.module.css';

export function FocusEngineWidget() {
  const {
    formattedTime,
    timerState,
    startFocus,
    pauseFocus,
    progressPercentage,
    soundscapeEnabled,
    setSoundscapeEnabled,
    stats
  } = useFocusTimer('sprint');

  const isRunning = timerState === 'running';

  // Compute live real telemetry
  const todayMins = stats?.todayFocusMinutes ?? 0;
  const todayFormatted =
    todayMins === 0
      ? '0m'
      : todayMins >= 60
      ? `${Math.floor(todayMins / 60)}h ${todayMins % 60}m`
      : `${todayMins}m`;

  const totalBlocks = stats?.totalIntervals || 6;
  const currentBlock = stats?.currentInterval || 1;
  const completedBlocks = (stats?.intervalsCompletedList || []).filter(Boolean).length;
  const targetFormatted = `${completedBlocks} / ${totalBlocks} blocks`;

  // SVG Dial stroke dash computation (circumference of r=70 is 2 * PI * 70 = 439.82)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <section className={styles.widget} aria-label="Focus Engine Widget">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.indicator} aria-hidden="true" />
          <h3 className={styles.title}>Focus Engine</h3>
        </div>
        <span className={styles.blockBadge}>
          Block {currentBlock} of {totalBlocks}
        </span>
      </div>

      <div className={styles.timerContainer}>
        <div className={styles.dialWrapper}>
          <svg className={styles.svgDial} viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} className={styles.dialTrack} />
            <circle
              cx="80"
              cy="80"
              r={radius}
              className={styles.dialProgress}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset
              }}
            />
          </svg>
          <div className={styles.dialCenter}>
            <span className={styles.timerDigits}>{formattedTime}</span>
            <span className={styles.timerMode}>
              {isRunning ? 'IN PROGRESS' : timerState === 'paused' ? 'PAUSED' : 'DEEP FOCUS'}
            </span>
            <span className={styles.timerHint}>
              {isRunning ? 'Space to Pause' : 'Press Space to Start'}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.startButton}
        onClick={isRunning ? pauseFocus : startFocus}
        aria-label={isRunning ? 'Pause Focus Session' : 'Start Focus Session'}
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          {isRunning ? (
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          ) : (
            <path d="M8 5v14l11-7z" />
          )}
        </svg>
        <span>{isRunning ? 'Pause Session' : 'Start Focus Session'}</span>
      </button>

      <div className={styles.footerStats}>
        <span>
          Today: <strong>{todayFormatted}</strong>
        </span>
        <span>
          Target: <strong>{targetFormatted}</strong>
        </span>
      </div>

      <div className={styles.audioRow}>
        <div className={styles.audioLabel}>
          <span role="img" aria-label="headphones">🎧</span>
          <span>Binaural Gamma Beat (40 Hz)</span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={soundscapeEnabled}
            onChange={(e) => setSoundscapeEnabled(e.target.checked)}
            aria-label="Toggle Binaural Gamma Beat audio"
          />
          <span className={styles.slider} />
        </label>
      </div>
    </section>
  );
}
