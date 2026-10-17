import React from 'react';
import styles from './Alert.module.css';

export interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ variant = 'info', title, children, className = '' }) => {
  return (
    <div className={`${styles.alert} ${styles[variant]} ${className}`} role="alert">
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.content}>{children}</div>
    </div>
  );
};
