import React from 'react';
import styles from './LoadingAnimation.module.css';
import type { BaseLoaderProps } from './types';

export function CubeLoader({ size = 'md', label, className = '' }: BaseLoaderProps) {
  return (
    <div className={`${styles.container} ${className}`.trim()} role="status" aria-label={label || 'Loading environment'}>
      <div className={`${styles.cubeWrapper} ${styles[`size-${size}`]}`}>
        <div className={styles.cubeItem}></div>
        <div className={`${styles.cubeItem} ${styles.cube2}`}></div>
        <div className={`${styles.cubeItem} ${styles.cube4}`}></div>
        <div className={`${styles.cubeItem} ${styles.cube3}`}></div>
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
