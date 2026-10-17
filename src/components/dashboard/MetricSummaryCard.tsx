import React from 'react';
import styles from './MetricSummaryCard.module.css';

export interface MetricSummaryCardProps {
  label: string;
  value: string | number;
  subtext?: React.ReactNode;
  delta?: string;
  variant?: 'primary' | 'warning' | 'success' | 'streak';
  icon: React.ReactNode;
  showDayPills?: boolean;
}

export function MetricSummaryCard({
  label,
  value,
  subtext,
  delta,
  variant = 'primary',
  icon,
  showDayPills = false
}: MetricSummaryCardProps) {
  const iconClass =
    variant === 'warning'
      ? styles.iconWrapperWarning
      : variant === 'success'
      ? styles.iconWrapperSuccess
      : variant === 'streak'
      ? styles.iconWrapperStreak
      : styles.iconWrapperPrimary;

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        <div className={`${styles.iconWrapper} ${iconClass}`} aria-hidden="true">
          {icon}
        </div>
      </div>

      <div className={styles.valueRow}>
        <div className={styles.value}>{value}</div>
        
        {delta && (
          <div className={styles.bottomMeta}>
            <span className={styles.trendGreen}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {delta}
            </span>
          </div>
        )}

        {subtext && !delta && (
          <div className={styles.bottomMeta}>
            {subtext}
          </div>
        )}

        {showDayPills && (
          <div className={styles.dayPillsRow} aria-label="Weekly streak days">
            {days.map((d, i) => {
              const todayIdx = (new Date().getDay() + 6) % 7;
              const isToday = i === todayIdx;
              return (
                <div key={i} className={styles.miniPill}>
                  <div
                    className={styles.miniPillBox}
                    style={isToday ? { fontWeight: 700, color: '#f59e0b' } : undefined}
                    title={isToday ? 'Today' : undefined}
                  >
                    {d}
                  </div>
                  <div
                    className={styles.miniPillDot}
                    style={isToday ? { background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' } : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
