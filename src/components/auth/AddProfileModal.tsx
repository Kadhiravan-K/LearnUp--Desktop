'use client';

import React, { useState } from 'react';
import styles from './AddProfileModal.module.css';

export interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: { name: string; email: string }) => void;
  onGoToSignUp?: () => void;
}

export function AddProfileModal({
  isOpen,
  onClose,
  onSaveProfile,
  onGoToSignUp
}: AddProfileModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a profile name.');
      return;
    }

    let trimmedEmail = email.trim();
    if (trimmedEmail && (!trimmedEmail.includes('@') || !trimmedEmail.includes('.'))) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!trimmedEmail) {
      trimmedEmail = `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}@local.learnup`;
    }

    onSaveProfile({
      name: trimmedName,
      email: trimmedEmail,
    });

    setName('');
    setEmail('');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="add-profile-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="add-profile-title" className={styles.title}>Add Learning Profile</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </div>
        <p className={styles.subtitle}>
          Create an offline local profile or save your credentials on this device.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.inputGroup}>
            <label htmlFor="profile-name" className={styles.label}>Profile Name *</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className={styles.input}
              required
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="profile-email" className={styles.label}>Email Address (Optional)</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com (optional)"
              className={styles.input}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              Save Profile
            </button>
          </div>

          {onGoToSignUp && (
            <div className={styles.signupHint}>
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                className={styles.signupLink}
                onClick={() => {
                  onClose();
                  onGoToSignUp();
                }}
              >
                Create Account
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
