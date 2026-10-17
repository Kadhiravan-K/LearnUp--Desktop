'use client';

import React from 'react';
import styles from './ThemePrimitives.module.css';

export interface TelemetryLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  value?: string | number;
  prefix?: string;
}

export function TelemetryLabel({ label, value, prefix = '•', className = '', ...rest }: TelemetryLabelProps) {
  return (
    <span className={`${styles.telemetryContainer} ${className}`} {...rest}>
      <span aria-hidden="true">{prefix}</span>
      <span>{label}</span>
      {value !== undefined && <strong style={{ color: 'var(--sf-color-primary)' }}>{value}</strong>}
    </span>
  );
}
