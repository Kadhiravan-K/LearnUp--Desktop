'use client';

import React, { useState, useMemo } from 'react';
import styles from './StudyConsistencyHeatmap.module.css';

export interface HeatmapDay {
  date: string;
  day: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface StudyConsistencyHeatmapProps {
  data?: HeatmapDay[];
  activeStreak?: number;
  longestStreak?: number;
  totalSessions?: number;
}

export function StudyConsistencyHeatmap({
  data = [],
  activeStreak = 0,
  longestStreak = 0,
  totalSessions = 0
}: StudyConsistencyHeatmapProps) {
  // Dynamically resolve system/local calendar current year
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(
    () => [currentYear.toString(), (currentYear - 1).toString()],
    [currentYear]
  );

  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Use real telemetry if provided, otherwise fill 52 weeks of 0s for a new user
  const totalCells = 52 * 7;
  const cells: HeatmapDay[] = data.length >= totalCells 
    ? data.slice(-totalCells)
    : [
        ...Array.from({ length: Math.max(0, totalCells - data.length) }, (_, i) => ({
          date: '',
          day: '',
          count: 0,
          level: 0 as const
        })),
        ...data
      ];

  const activeDaysCount = cells.filter((c) => c.count > 0).length;
  const consistencyPercent = cells.length > 0 ? ((activeDaysCount / cells.length) * 100).toFixed(1) : '0.0';

  return (
    <section className={styles.card} aria-label="Study Consistency Heatmap">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <svg className={styles.gridIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <h3 className={styles.title}>{totalSessions} Study Sprints in {selectedYear}</h3>
          <span className={styles.cohortBadge}>Active Cohort</span>
          <p className={styles.subtitle}>Study Consistency &amp; Neural Retention Matrix &bull; Continuous telemetry across past 52 weeks</p>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.yearPills} role="group" aria-label="Select heatmap year">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                className={`${styles.yearBtn} ${selectedYear === yr ? styles.yearBtnActive : ''}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr}
              </button>
            ))}
          </div>

          <span className={styles.statBadge}>{activeDaysCount} / 365 Study Days ({consistencyPercent}%)</span>
        </div>
      </div>

      <div className={styles.gridWrapper}>
        <div className={styles.monthsRow}>
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        <div className={styles.heatmapContainer}>
          <div className={styles.dayLabelsCol}>
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>

          <div className={styles.cellsGrid}>
            {cells.map((cell, index) => {
              const isLastCell = index === cells.length - 1;
              const levelClass =
                cell.level === 0
                  ? styles.level0
                  : cell.level === 1
                  ? styles.level1
                  : cell.level === 2
                  ? styles.level2
                  : cell.level === 3
                  ? styles.level3
                  : styles.level4;

              return (
                <div
                  key={cell.date || `cell-${index}`}
                  className={`${styles.cell} ${levelClass} ${isLastCell ? styles.todayCell : ''}`}
                  title={
                    cell.date
                      ? `${cell.date}: ${cell.count} session${cell.count === 1 ? '' : 's'}`
                      : 'No activity recorded'
                  }
                  role="gridcell"
                  aria-label={cell.date ? `${cell.date}, ${cell.count} sessions` : 'No study data'}
                />
              );
            })}
          </div>
        </div>

        <div className={styles.legendRow}>
          <span className={styles.legendLabel}>Less</span>
          <div className={styles.legendSquares}>
            <span className={`${styles.legendSquare} ${styles.level0}`} />
            <span className={`${styles.legendSquare} ${styles.level1}`} />
            <span className={`${styles.legendSquare} ${styles.level2}`} />
            <span className={`${styles.legendSquare} ${styles.level3}`} />
            <span className={`${styles.legendSquare} ${styles.level4}`} />
          </div>
          <span className={styles.legendLabel}>More</span>
        </div>
      </div>

      <div className={styles.footerMetrics}>
        <div className={styles.metricItem}>
          <span className={styles.metricValue}>{activeStreak} Days</span>
          <span className={styles.metricLabel}>Current Active Streak</span>
        </div>
        <div className={styles.metricDivider} />
        <div className={styles.metricItem}>
          <span className={styles.metricValue}>{longestStreak} Days</span>
          <span className={styles.metricLabel}>All-Time Longest Streak</span>
        </div>
        <div className={styles.metricDivider} />
        <div className={styles.metricItem}>
          <span className={styles.metricValue}>{consistencyPercent}%</span>
          <span className={styles.metricLabel}>Annual Consistency Score</span>
        </div>
      </div>
    </section>
  );
}
