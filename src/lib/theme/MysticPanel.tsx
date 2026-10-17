'use client';

import React from 'react';
import styles from './ThemePrimitives.module.css';

export interface MysticPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  glyph?: string;
  children: React.ReactNode;
}

export function MysticPanel({ title, glyph = '✦', children, className = '', ...rest }: MysticPanelProps) {
  return (
    <div className={`${styles.mysticPanel} ${className}`} {...rest}>
      {title && (
        <div className={styles.mysticHeader}>
          <span className={styles.mysticGlyph} aria-hidden="true">{glyph}</span>
          <h3 className={styles.mysticTitle}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
