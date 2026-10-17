'use client';

import React from 'react';
import styles from './ThemePrimitives.module.css';

export interface HUDPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  statusBadge?: string;
  children: React.ReactNode;
}

export function HUDPanel({ title, statusBadge, children, className = '', ...rest }: HUDPanelProps) {
  return (
    <div className={`${styles.hudPanel} ${className}`} {...rest}>
      {title && (
        <div className={styles.hudHeader}>
          <span className={styles.hudTitle}>{title}</span>
          {statusBadge && <span className={styles.telemetryContainer}>[{statusBadge}]</span>}
        </div>
      )}
      {children}
    </div>
  );
}
