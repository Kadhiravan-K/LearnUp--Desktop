'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { SavedProfile } from './ProfileChooser';
import styles from './ProfileUnlockModal.module.css';

export interface ProfileUnlockModalProps {
  profile: SavedProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (profile: SavedProfile) => void;
  onFallbackSignIn: (email: string) => void;
}

export function ProfileUnlockModal({
  profile,
  isOpen,
  onClose,
  onUnlock,
  onFallbackSignIn
}: ProfileUnlockModalProps) {
  const isPin = profile?.lockType?.startsWith('pin');
  const pinLength = profile?.pinLength || (profile?.lockType === 'pin-6' ? 6 : 4);
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPassword('');
      setPinDigits(new Array(pinLength).fill(''));
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [isOpen, pinLength]);

  if (!isOpen || !profile) return null;

  const handleVerify = () => {
    setError(null);
    if (isPin) {
      const enteredPin = pinDigits.join('');
      if (enteredPin.length < pinLength) {
        setError(`Please enter all ${pinLength} digits.`);
        return;
      }

      if (profile.hashedPin && profile.hashedPin !== enteredPin) {
        setError('Incorrect PIN. Please try again.');
        setPinDigits(new Array(pinLength).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      onUnlock(profile);
    } else {
      if (!password) {
        setError('Please enter your password.');
        return;
      }

      if (profile.hashedPin && profile.hashedPin !== password) {
        setError('Incorrect password. Please try again.');
        return;
      }

      onUnlock(profile);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...pinDigits];
    updated[index] = digit;
    setPinDigits(updated);

    if (digit && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if last digit entered
    if (digit && index === pinLength - 1 && updated.every((d) => d !== '')) {
      const completePin = updated.join('');
      if (profile.hashedPin && profile.hashedPin !== completePin) {
        setError('Incorrect PIN. Please try again.');
        setPinDigits(new Array(pinLength).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        onUnlock(profile);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handleKeypadPress = (digit: string) => {
    const firstEmptyIdx = pinDigits.findIndex((d) => !d);
    if (firstEmptyIdx !== -1) {
      handleDigitChange(firstEmptyIdx, digit);
    }
  };

  const handleKeypadBackspace = () => {
    const lastFilledIdx = [...pinDigits].reverse().findIndex((d) => d !== '');
    if (lastFilledIdx !== -1) {
      const realIdx = pinLength - 1 - lastFilledIdx;
      const updated = [...pinDigits];
      updated[realIdx] = '';
      setPinDigits(updated);
      inputRefs.current[realIdx]?.focus();
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className={styles.modal}>
        <div
          className={styles.avatar}
          style={{ background: profile.color || 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          {profile.initials || profile.name.charAt(0).toUpperCase()}
        </div>

        <h2 id="unlock-title" className={styles.title}>Unlock {profile.name}&apos;s Profile</h2>
        <p className={styles.subtitle}>
          {isPin
            ? `Enter your ${pinLength}-digit security PIN to access your study sanctuary.`
            : 'Enter your profile password to access your study sanctuary.'}
        </p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {isPin ? (
          <>
            {/* PIN Boxes */}
            <div className={styles.pinContainer} role="group" aria-label="Security PIN digits">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className={`${styles.pinBox} ${digit ? styles.pinBoxFilled : ''}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  aria-label={`PIN Digit ${idx + 1}`}
                  autoComplete="off"
                />
              ))}
            </div>

            {/* Quick Keypad */}
            {pinLength <= 6 && (
              <div className={styles.keypadGrid}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={styles.keypadBtn}
                    onClick={() => handleKeypadPress(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.keypadBtn}
                  onClick={() => setPinDigits(new Array(pinLength).fill(''))}
                  style={{ fontSize: '0.875rem' }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className={styles.keypadBtn}
                  onClick={() => handleKeypadPress('0')}
                >
                  0
                </button>
                <button
                  type="button"
                  className={styles.keypadBtn}
                  onClick={handleKeypadBackspace}
                >
                  ⌫
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              className={styles.passwordInput}
              placeholder="Enter profile password (4-15 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
              autoFocus
            />
            <button
              type="button"
              className={styles.toggleEyeBtn}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '🔒'}
            </button>
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.unlockBtn} onClick={handleVerify}>
            Unlock Profile &rarr;
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => onFallbackSignIn(profile.email)}
          >
            Sign in with Account Password instead
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
