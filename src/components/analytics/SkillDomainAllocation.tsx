'use client';

import React from 'react';
import styles from './SkillDomainAllocation.module.css';

export interface SkillDomainItem {
  name: string;
  count: number;
  hours: number;
  percentage: number;
  color: string;
}

export interface SkillDomainAllocationProps {
  domains?: SkillDomainItem[];
}

export function SkillDomainAllocation({ domains = [] }: SkillDomainAllocationProps) {
  const displayDomains = domains.length > 0 ? domains : [];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Skill &amp; Domain Allocation</h3>
          <p className={styles.subtitle}>Cognitive capital allocated across disciplines</p>
        </div>
        <button type="button" className={styles.iconButton} aria-label="Domain details">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 10 10H12V2z" />
          </svg>
        </button>
      </div>

      {displayDomains.length === 0 ? (
        <div style={{ padding: 'var(--sf-space-6) var(--sf-space-4)', textAlign: 'center', color: 'var(--sf-color-text-tertiary)', fontSize: 'var(--sf-text-xs)' }}>
          No learning domain data yet. Add courses or study videos to track domain allocation.
        </div>
      ) : (
        <>
          <div className={styles.stackedBar} role="progressbar" aria-label="Domain distribution bar">
            {displayDomains.map((d, idx) => (
              <div
                key={idx}
                style={{
                  width: `${d.percentage}%`,
                  backgroundColor: d.color,
                  height: '100%'
                }}
              />
            ))}
          </div>

          <div className={styles.domainList}>
            {displayDomains.map((d, idx) => (
              <div key={idx} className={styles.domainItem}>
                <div className={styles.domainLeft}>
                  <span className={styles.dot} style={{ backgroundColor: d.color }} />
                  <span className={styles.domainName}>{d.name}</span>
                </div>
                <div className={styles.domainRight}>
                  <span className={styles.hours}>{d.hours} hrs</span>
                  <span className={styles.percent}>{d.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

