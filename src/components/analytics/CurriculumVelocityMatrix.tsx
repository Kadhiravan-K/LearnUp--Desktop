'use client';

import React from 'react';
import styles from './CurriculumVelocityMatrix.module.css';

export interface CourseTrackItem {
  id: string;
  title: string;
  progressPercent: number;
  totalDurationSeconds?: number;
}

export interface CurriculumVelocityMatrixProps {
  items?: CourseTrackItem[];
}

export function CurriculumVelocityMatrix({ items = [] }: CurriculumVelocityMatrixProps) {
  const tracks = items.map((item) => {
    const percent = Math.round(item.progressPercent || 0);
    const hoursRemaining = Math.max(
      0,
      Number((((item.totalDurationSeconds || 3600) * (1 - percent / 100)) / 3600).toFixed(1))
    );
    
    let status = 'Not Started';
    let badgeClass = styles.badgeTrack;
    let progressClass = styles.progressTrack;

    if (percent >= 100) {
      status = 'Completed';
      badgeClass = styles.badgeNearDone;
      progressClass = styles.progressNearDone;
    } else if (percent > 60) {
      status = 'Ahead Pace';
      badgeClass = styles.badgeAhead;
      progressClass = styles.progressAhead;
    } else if (percent > 0) {
      status = 'In Progress';
      badgeClass = styles.badgeTrack;
      progressClass = styles.progressTrack;
    }

    return {
      title: item.title,
      status,
      badgeClass,
      progressClass,
      percent,
      remaining: `${hoursRemaining}h remaining`
    };
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Curriculum Velocity Matrix</h3>
          <p className={styles.subtitle}>Real-time track pacing and burn-down estimates</p>
        </div>
        <button type="button" className={styles.iconButton} aria-label="Open matrix details">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>

      {tracks.length === 0 ? (
        <div style={{ padding: 'var(--sf-space-6) var(--sf-space-4)', textAlign: 'center', color: 'var(--sf-color-text-tertiary)', fontSize: 'var(--sf-text-xs)' }}>
          No active curriculum items. Import courses into your library to track velocity.
        </div>
      ) : (
        <div className={styles.courseList}>
          {tracks.slice(0, 5).map((track, idx) => (
            <div key={idx} className={styles.courseItem}>
              <div className={styles.courseTop}>
                <span className={styles.courseTitle}>{track.title}</span>
                <span className={track.badgeClass}>{track.status}</span>
              </div>

              <div className={styles.progressContainer}>
                <div className={track.progressClass} style={{ width: `${track.percent}%` }} />
              </div>

              <div className={styles.courseBottom}>
                <span>{track.percent}% Complete</span>
                <span>{track.remaining}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

