'use client';

import React from 'react';
import styles from './ThemePrimitives.module.css';

export interface GlowStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  pulse?: boolean;
  color?: string;
}

export function GlowStatus({ label, pulse = true, color, className = '', ...rest }: GlowStatusProps) {
  return (
    <div className={`${styles.statusWrapper} ${className}`} {...rest}>
      <span
        className={`${styles.statusDot} ${pulse ? styles.statusPulse : ''}`}
        style={color ? { backgroundColor: color, boxShadow: `0 0 8px ${color}` } : undefined}
        aria-hidden="true"
      />
      {label && <span className={styles.telemetryContainer}>{label}</span>}
    </div>
  );
}
