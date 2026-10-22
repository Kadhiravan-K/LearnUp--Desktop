'use client';

import React, { useState, useEffect } from 'react';
import type { SavedProfile, ProfileLockType } from './ProfileChooser';
import styles from './ProfileSecurityModal.module.css';

export interface ProfileSecurityModalProps {
  profile: SavedProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: SavedProfile) => void;
}

export function ProfileSecurityModal({
  profile,
  isOpen,
  onClose,
  onSave
}: ProfileSecurityModalProps) {
  const [lockType, setLockType] = useState<ProfileLockType>('none');
  const [customLength, setCustomLength] = useState<number>(6);
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && profile) {
      setError(null);
      setLockType(profile.lockType || 'none');
      setCustomLength(profile.pinLength || 6);
      setSecret(profile.hashedPin || '');
      setConfirmSecret(profile.hashedPin || '');
    }
  }, [isOpen, profile]);

  if (!isOpen || !profile) return null;

  const getRequiredLength = () => {
    if (lockType === 'pin-4') return 4;
    if (lockType === 'pin-6') return 6;
    if (lockType === 'pin-custom') return customLength;
    if (lockType === 'password') return customLength;
    return 0;
  };

  const handleSave = () => {
    setError(null);

    if (lockType === 'none') {
      const updated: SavedProfile = {
        ...profile,
        lockType: 'none',
        hashedPin: undefined,
        pinLength: undefined,
        hasLock: false
      };
      onSave(updated);
      onClose();
      return;
    }

    const reqLength = getRequiredLength();

    if (!secret) {
      setError('Please enter your security code / password.');
      return;
    }

    if (secret !== confirmSecret) {
      setError('Codes do not match. Please verify.');
      return;
    }

    if (lockType.startsWith('pin')) {
      if (!/^\d+$/.test(secret)) {
        setError('PIN must contain only numbers.');
        return;
      }
      if (secret.length !== reqLength) {
        setError(`PIN must be exactly ${reqLength} digits.`);
        return;
      }
    } else if (lockType === 'password') {
      if (secret.length < 4 || secret.length > 15) {
        setError('Password must be between 4 and 15 characters.');
        return;
      }
    }

    const updated: SavedProfile = {
      ...profile,
      lockType,
      pinLength: reqLength,
      hashedPin: secret,
      hasLock: true
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="sec-modal-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="sec-modal-title" className={styles.title}>
            🔒 Profile Security Lock &bull; {profile.name}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Lock Type Selection */}
        <div className={styles.formGroup}>
          <span className={styles.label}>Choose Lock Type</span>
          <div className={styles.lockTypeGrid}>
            <button
              type="button"
              className={`${styles.typeCard} ${lockType === 'none' ? styles.typeCardActive : ''}`}
              onClick={() => setLockType('none')}
            >
              <span className={styles.typeName}>🔓 None</span>
              <span className={styles.typeDesc}>Instant 1-click access</span>
            </button>

            <button
              type="button"
              className={`${styles.typeCard} ${lockType === 'pin-4' ? styles.typeCardActive : ''}`}
              onClick={() => setLockType('pin-4')}
            >
              <span className={styles.typeName}>🔢 4-Digit PIN</span>
              <span className={styles.typeDesc}>Quick numerical passcode</span>
            </button>

            <button
              type="button"
              className={`${styles.typeCard} ${lockType === 'pin-6' ? styles.typeCardActive : ''}`}
              onClick={() => setLockType('pin-6')}
            >
              <span className={styles.typeName}>🔢 6-Digit PIN</span>
              <span className={styles.typeDesc}>Standard numerical lock</span>
            </button>

            <button
              type="button"
              className={`${styles.typeCard} ${lockType === 'pin-custom' ? styles.typeCardActive : ''}`}
              onClick={() => setLockType('pin-custom')}
            >
              <span className={styles.typeName}>⚙️ Custom PIN</span>
              <span className={styles.typeDesc}>Customizable (4 - 15 digits)</span>
            </button>

            <button
              type="button"
              className={`${styles.typeCard} ${lockType === 'password' ? styles.typeCardActive : ''}`}
              onClick={() => setLockType('password')}
              style={{ gridColumn: 'span 2' }}
            >
              <span className={styles.typeName}>🔑 Profile Password</span>
              <span className={styles.typeDesc}>Alphanumeric password (4 - 15 chars)</span>
            </button>
          </div>
        </div>

        {/* Custom Length Slider */}
        {(lockType === 'pin-custom' || lockType === 'password') && (
          <div className={styles.formGroup}>
            <div className={styles.lengthSliderRow}>
              <span className={styles.label}>
                {lockType === 'pin-custom' ? 'PIN Length (Digits)' : 'Password Max Length'}
              </span>
              <span className={styles.lengthBadge}>{customLength} {lockType === 'pin-custom' ? 'digits' : 'chars'}</span>
            </div>
            <input
              type="range"
              min="4"
              max="15"
              step="1"
              value={customLength}
              onChange={(e) => setCustomLength(parseInt(e.target.value, 10))}
              className={styles.slider}
            />
          </div>
        )}

        {/* Secret Inputs */}
        {lockType !== 'none' && (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="secret-input" className={styles.label}>
                {lockType.startsWith('pin') ? `Enter ${getRequiredLength()}-Digit PIN` : 'Enter Password (4-15 chars)'}
              </label>
              <input
                id="secret-input"
                type={lockType.startsWith('pin') ? 'tel' : 'password'}
                inputMode={lockType.startsWith('pin') ? 'numeric' : 'text'}
                maxLength={lockType.startsWith('pin') ? getRequiredLength() : 15}
                className={styles.input}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={lockType.startsWith('pin') ? '●'.repeat(getRequiredLength()) : 'Enter password'}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirm-secret-input" className={styles.label}>
                Confirm {lockType.startsWith('pin') ? 'PIN' : 'Password'}
              </label>
              <input
                id="confirm-secret-input"
                type={lockType.startsWith('pin') ? 'tel' : 'password'}
                inputMode={lockType.startsWith('pin') ? 'numeric' : 'text'}
                maxLength={lockType.startsWith('pin') ? getRequiredLength() : 15}
                className={styles.input}
                value={confirmSecret}
                onChange={(e) => setConfirmSecret(e.target.value)}
                placeholder={lockType.startsWith('pin') ? '●'.repeat(getRequiredLength()) : 'Re-enter password'}
              />
            </div>
          </>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Save Security Settings
          </button>
        </div>
      </div>
    </div>
  );
}
