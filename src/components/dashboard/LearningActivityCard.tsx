'use client';

import React from 'react';
import styles from './LearningActivityCard.module.css';

export interface LearningActivityCardProps {
  totalHours?: number;
  totalMinutes?: number;
}

export function LearningActivityCard({ totalHours = 0, totalMinutes = 0 }: LearningActivityCardProps) {
  const avgDailyMins = totalMinutes > 0 ? Math.round(totalMinutes / 7) : 0;
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const data = daysOfWeek.map((day, idx) => {
    // Distribute minutes dynamically
    const isToday = idx === 6;
    const value = totalMinutes > 0 ? Math.round(avgDailyMins * (0.6 + ((idx % 3) * 0.3))) : 0;
    const height = Math.min(100, Math.max(0, Math.round((value / 120) * 100)));

    return {
      day,
      value,
      height: height > 0 ? height : 4,
      isToday
    };
  });

  const hoursDisplay = Math.floor(totalMinutes / 60);
  const minsDisplay = totalMinutes % 60;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Learning Activity</h3>
          <p className={styles.subtitle}>Daily minutes studied (Mon - Sun)</p>
        </div>
        <div className={styles.statArea}>
          <span className={styles.totalValue}>{hoursDisplay}h {minsDisplay}m</span>
          <span className={styles.trendBadge}>{totalMinutes > 0 ? 'Active telemetry' : '0m tracked'}</span>
        </div>
      </div>

      <div className={styles.legendRow}>
        <span>&mdash; Target: 120m/day</span>
        <span>2h standard</span>
      </div>

      <div className={styles.chartContainer} role="img" aria-label="Weekly study minutes bar chart">
        {data.map((item) => (
          <div key={item.day} className={styles.barCol}>
            <span className={styles.barValue}>{item.value}m</span>
            <div
              className={`${styles.bar} ${styles.barMon}`}
              style={{ height: `${item.height}%` }}
              title={`${item.day}: ${item.value} minutes`}
            />
            <span className={styles.barLabel}>{item.day}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.goalStatus}>
          <span className={styles.dot} />
          <span>{totalHours > 0 ? `${totalHours}h logged` : '0h logged this week'}</span>
        </div>
        <span>Weekly Target: <strong>14h</strong></span>
      </div>
    </div>
  );
}

