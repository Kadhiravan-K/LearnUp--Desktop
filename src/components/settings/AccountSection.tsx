'use client';

import React from 'react';
import { Button } from '@/components/ui/Button/Button';
import styles from './AccountSection.module.css';

export interface AccountSectionProps {
  username: string;
  displayName: string;
  email: string;
  studentId: string;
  avatarUrl: string | null;
  onChange: (field: string, value: string) => void;
  onSignOutAll?: () => void;
}

export function AccountSection({
  username,
  displayName,
  email,
  studentId,
  avatarUrl,
  onChange,
  onSignOutAll
}: AccountSectionProps) {
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'E';

  return (
    <section id="account" className={styles.section} aria-labelledby="account-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>👤</span>
          <h2 id="account-heading" className={styles.title}>Account Credentials</h2>
        </div>
        <span className={styles.proBadge}>PRO SUBSCRIBER</span>
      </div>

      {/* Avatar & Student ID */}
      <div className={styles.profileRow}>
        <div className={styles.avatar}>
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt={displayName} className={styles.avatarImg} />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <div className={styles.profileDetails}>
          <div className={styles.nameRow}>
            <span className={styles.profileName}>{displayName || 'Learner'}</span>
            {studentId && <span className={styles.studentIdBadge}>STUDENT ID: {studentId}</span>}
          </div>
          <p className={styles.avatarNote}>
            Recommended format: PNG, WEBP, or SVG under 2MB. Stored locally in encrypted partition.
          </p>
          <div className={styles.avatarActions}>
            <button type="button" className={styles.uploadBtn}>Upload Avatar</button>
            <button type="button" className={styles.removeBtn}>Remove</button>
          </div>
        </div>
      </div>

      {/* Form Fields: Username & Display Name */}
      <div className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <label htmlFor="username-input" className={styles.label}>USERNAME</label>
          <div className={styles.inputWrapper}>
            <input
              id="username-input"
              type="text"
              className={styles.input}
              value={username ? (username.startsWith('@') ? username : `@${username}`) : ''}
              onChange={(e) => onChange('username', e.target.value.replace(/^@/, ''))}
              placeholder="@username"
            />
            <span className={styles.validCheck} aria-label="Valid username">✓</span>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="displayname-input" className={styles.label}>DISPLAY NAME</label>
          <input
            id="displayname-input"
            type="text"
            className={styles.input}
            value={displayName || ''}
            onChange={(e) => onChange('display_name', e.target.value)}
            placeholder="Learner"
          />
        </div>
      </div>

      {/* Primary Email Address */}
      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="email-input" className={styles.label}>PRIMARY EMAIL ADDRESS</label>
          <span className={styles.verifiedBadge}>✓ Verified</span>
        </div>
        <div className={styles.emailRow}>
          <input
            id="email-input"
            type="email"
            className={styles.input}
            value={email || ''}
            placeholder="learner@example.com"
            disabled
          />
          <Button variant="secondary" size="sm">Update</Button>
        </div>
      </div>

      {/* Authentication & Password Card */}
      <div className={styles.authCard}>
        <div className={styles.authLeft}>
          <span className={styles.authTitle}>Authentication &amp; Password</span>
          <span className={styles.authDesc}>Last updated 42 days ago (Passkey enabled)</span>
        </div>
        <button type="button" className={styles.changePasswordBtn}>Change Password</button>
      </div>

      {/* Active Sessions */}
      <div className={styles.sessionFooter}>
        <div className={styles.sessionInfo}>
          <span className={styles.sessionIcon}>💻</span>
          <span>Active sessions: 2 devices (MacBook Pro 16&quot;, iPhone 15 Pro)</span>
        </div>
        <button type="button" className={styles.logoutAllBtn} onClick={onSignOutAll}>
          Log Out All Devices
        </button>
      </div>
    </section>
  );
}
