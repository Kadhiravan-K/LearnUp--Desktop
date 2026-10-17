import React from 'react';
import styles from './AnalyticsMetricCard.module.css';

export interface AnalyticsMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaType?: 'positive' | 'neutral' | 'highlight';
  subtext?: string;
  icon: React.ReactNode;
}

export function AnalyticsMetricCard({
  label,
  value,
  unit,
  delta,
  deltaType = 'positive',
  subtext,
  icon
}: AnalyticsMetricCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        <div className={styles.iconWrapper} aria-hidden="true">
          {icon}
        </div>
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>

      <div className={styles.metaRow}>
        {delta && (
          <span className={deltaType === 'highlight' ? styles.trendOrange : styles.trendGreen}>
            {delta}
          </span>
        )}
        {subtext && <span className={styles.subtext}>{subtext}</span>}
      </div>
    </div>
  );
}
