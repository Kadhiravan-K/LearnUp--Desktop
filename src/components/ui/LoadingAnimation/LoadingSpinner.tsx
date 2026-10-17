import React from 'react';
import styles from './LoadingAnimation.module.css';
import type { BaseLoaderProps } from './types';

export function LoadingSpinner({ size = 'md', label, className = '' }: BaseLoaderProps) {
  return (
    <div className={`${styles.container} ${className}`.trim()} role="status" aria-label={label || 'Loading'}>
      <div className={`${styles.spinnerWrapper} ${styles[`size-${size}`]}`}>
        <div className={styles.spinnerRing} />
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
