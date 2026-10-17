'use client';

import React from 'react';
import { PlayerLayout } from '@/lib/types';
import styles from './LearningPrefsSection.module.css';

export interface LearningPrefsSectionProps {
  autoMarkCompleted: boolean;
  playerLayout: PlayerLayout;
  streakThreshold: number;
  srsAlgorithm: string;
  onToggleAutoMark: (value: boolean) => void;
  onChangeLayout: (layout: PlayerLayout) => void;
  onChangeStreakThreshold: (minutes: number) => void;
  onChangeSrsAlgorithm: (algo: string) => void;
}

export function LearningPrefsSection({
  autoMarkCompleted,
  playerLayout,
  streakThreshold,
  srsAlgorithm,
  onToggleAutoMark,
  onChangeLayout,
  onChangeStreakThreshold,
  onChangeSrsAlgorithm
}: LearningPrefsSectionProps) {
  return (
    <section id="learning-prefs" className={styles.section} aria-labelledby="learning-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>📖</span>
          <h2 id="learning-heading" className={styles.title}>Curriculum &amp; Video Engine</h2>
        </div>
        <span className={styles.fsrsBadge}>FSRS-4.5 ENGINE</span>
      </div>

      {/* Auto-mark Video Completed */}
      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Auto-mark video completed at 90% playback</span>
          <p className={styles.toggleDesc}>Prevents blocking course progress on outro credits.</p>
        </div>
        <button
          type="button"
          className={`${styles.toggleSwitch} ${autoMarkCompleted ? styles.toggleOn : ''}`}
          onClick={() => onToggleAutoMark(!autoMarkCompleted)}
          aria-pressed={autoMarkCompleted}
        >
          <span className={styles.toggleHandle} />
        </button>
      </div>

      {/* Default Player Layout */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>DEFAULT PLAYER LAYOUT</span>
        <div className={styles.layoutGrid}>
          {/* Technical Workstation */}
          <button
            type="button"
            className={`${styles.layoutCard} ${playerLayout === 'technical_workstation' ? styles.layoutCardActive : ''}`}
            onClick={() => onChangeLayout('technical_workstation')}
            aria-pressed={playerLayout === 'technical_workstation'}
          >
            <div className={styles.layoutCardTop}>
              <div className={styles.layoutLeft}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={styles.layoutIcon}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                <div className={styles.layoutDetails}>
                  <span className={styles.layoutName}>Technical Workstation</span>
                  <span className={styles.layoutDesc}>Code sandbox + Markdown notes docked</span>
                </div>
              </div>
              <span className={playerLayout === 'technical_workstation' ? styles.checkCircleActive : styles.checkCircleInactive}>
                <span className={styles.innerDot} />
              </span>
            </div>
          </button>

          {/* Cinema Mode */}
          <button
            type="button"
            className={`${styles.layoutCard} ${playerLayout === 'cinema_mode' ? styles.layoutCardActive : ''}`}
            onClick={() => onChangeLayout('cinema_mode')}
            aria-pressed={playerLayout === 'cinema_mode'}
          >
            <div className={styles.layoutCardTop}>
              <div className={styles.layoutLeft}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={styles.layoutIcon}>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                <div className={styles.layoutDetails}>
                  <span className={styles.layoutName}>Cinema Mode</span>
                  <span className={styles.layoutDesc}>Full-width ultra distraction-free theater</span>
                </div>
              </div>
              <span className={playerLayout === 'cinema_mode' ? styles.checkCircleActive : styles.checkCircleInactive}>
                <span className={styles.innerDot} />
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Streak Threshold & Spaced Repetition Grid */}
      <div className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldHeader}>
            <label htmlFor="streak-threshold" className={styles.groupLabel}>STREAK THRESHOLD</label>
            <span className={styles.fieldUnit}>30 mins/day</span>
          </div>
          <input
            id="streak-threshold"
            type="number"
            min={1}
            max={1440}
            className={styles.input}
            value={streakThreshold}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val > 0) {
                onChangeStreakThreshold(val);
              }
            }}
          />
          <p className={styles.helperText}>Minimum focused time required to preserve active flame streak.</p>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="srs-select" className={styles.groupLabel}>SPACED REPETITION ALGORITHM</label>
          <select
            id="srs-select"
            className={styles.select}
            value={srsAlgorithm}
            onChange={(e) => onChangeSrsAlgorithm(e.target.value)}
          >
            <option value="leitner">Leitner Interval (1, 3, 7, 14, 30 days)</option>
            <option value="fsrs">FSRS-4.5 Adaptive Neural Decay</option>
            <option value="sm2">SuperMemo-2 Classic Linear</option>
            <option value="exponential">Custom Exponential Half-Life</option>
          </select>
          <p className={styles.helperText}>Controls card graduation and memory stability math.</p>
        </div>
      </div>
    </section>
  );
}
