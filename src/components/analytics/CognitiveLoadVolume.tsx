'use client';

import React from 'react';
import styles from './CognitiveLoadVolume.module.css';

export interface CognitiveLoadVolumeProps {
  totalHours?: number;
  totalSprints?: number;
}

export function CognitiveLoadVolume({ totalHours = 0, totalSprints = 0 }: CognitiveLoadVolumeProps) {
  // 4 weekly blocks: calculate from user real hours/sprints
  const avgWeeklyHours = totalHours > 0 ? (totalHours / 4).toFixed(1) : '0.0';
  const avgWeeklySprints = totalSprints > 0 ? Math.round(totalSprints / 4) : 0;

  const weeks = [
    { label: 'Week 1', hours: `${avgWeeklyHours} hrs`, barClass: styles.barGreen, sprints: `${avgWeeklySprints} Focus Sprints` },
    { label: 'Week 2', hours: `${avgWeeklyHours} hrs`, barClass: styles.barGreen, sprints: `${avgWeeklySprints} Focus Sprints` },
    { label: 'Week 3', hours: `${avgWeeklyHours} hrs`, barClass: styles.barOrange, sprints: `${avgWeeklySprints} Focus Sprints` },
    {
      label: 'Week 4 (Current)',
      hours: `${avgWeeklyHours} hrs`,
      barClass: styles.barPurple,
      sprints: `${avgWeeklySprints} Focus Sprints`,
      isCurrent: true
    }
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Weekly Cognitive Load &amp; Sprint Volume</h3>
          <p className={styles.subtitle}>Cumulative workload across study sessions</p>
        </div>
        <span className={styles.quotaBadge}>{totalHours}h Total Tracked</span>
      </div>

      <div className={styles.weeksGrid}>
        {weeks.map((w, idx) => (
          <div
            key={idx}
            className={`${styles.weekBox} ${w.isCurrent ? styles.weekBoxCurrent : ''}`}
          >
            <span className={`${styles.weekLabel} ${w.isCurrent ? styles.weekLabelCurrent : ''}`}>
              {w.label}
            </span>
            <span className={`${styles.hoursValue} ${w.isCurrent ? styles.hoursValueCurrent : ''}`}>
              {w.hours}
            </span>
            <div className={`${styles.bar} ${w.barClass}`} />
            <span className={styles.sprintsText}>{w.sprints}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

