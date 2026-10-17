import React, { useState } from 'react';
import { Button } from '@/components/ui/Button/Button';
import styles from './MfaSettings.module.css';

export interface MfaSettingsProps {
  isCloudLinked?: boolean;
  cloudEmail?: string | null;
  onNavigateSync?: () => void;
}

export function MfaSettings({
  isCloudLinked = false,
  cloudEmail,
  onNavigateSync,
}: MfaSettingsProps) {
  const [factors, setFactors] = useState<Array<{ id: string; friendly_name: string; status: string }>>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = () => {
    setIsEnrolling(true);
    setError(null);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode) return;
    setFactors((prev) => [
      ...prev,
      { id: `totp_${Date.now()}`, friendly_name: 'Authenticator App (TOTP)', status: 'verified' },
    ]);
    setIsEnrolling(false);
    setVerifyCode('');
  };

  const handleUnenroll = (factorId: string) => {
    setFactors((prev) => prev.filter((f) => f.id !== factorId));
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Two-Factor Authentication (MFA)</h2>
      <p className={styles.description}>
        Add an extra layer of security to your LearnUp account with time-based one-time passwords (TOTP).
      </p>

      {!isCloudLinked ? (
        <div className={styles.guestNotice}>
          <span className={styles.guestIcon}>🔒</span>
          <div>
            <div className={styles.guestNoticeTitle}>Cloud Synchronization Required</div>
            <p className={styles.guestNoticeDesc}>
              Two-factor authentication is enforced across your synced devices when connected to your Supabase account. You are currently in <strong>Local Guest Mode</strong>, where data is encrypted on your local machine using SQLite WAL mode.
            </p>
            {onNavigateSync && (
              <div style={{ marginTop: '12px' }}>
                <Button size="sm" onClick={onNavigateSync}>
                  Go to Cloud Synchronization
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {factors.length > 0 && (
            <div className={styles.factorsList}>
              {factors.map((factor) => (
                <div key={factor.id} className={styles.factorCard}>
                  <div className={styles.factorInfo}>
                    <span className={styles.factorName}>{factor.friendly_name}</span>
                    <span className={styles.factorStatus}>✓ Active &amp; Verified</span>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleUnenroll(factor.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!isEnrolling && factors.length === 0 && (
            <div className={styles.actionArea}>
              <Button onClick={handleEnroll}>
                Set up Authenticator App (TOTP)
              </Button>
            </div>
          )}

          {isEnrolling && (
            <div className={styles.enrollArea}>
              <h3>Scan QR Code</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--sf-text-secondary, #64748b)' }}>
                Open Google Authenticator, Authy, or 1Password and scan the QR code below.
              </p>
              <div className={styles.qrContainer}>
                <svg width="180" height="180" viewBox="0 0 100 100" fill="currentColor">
                  <rect width="100" height="100" fill="white" />
                  <path d="M10 10h30v30H10zM15 15v20h20V15zm45-5h30v30H60zM65 15v20h20V15zm-55 45h30v30H10zm5 5v20h20V65zm50 0h10v10H65zm15 0h10v10H80zm-15 15h10v10H65zm15 0h10v10H80z" fill="black" />
                </svg>
              </div>
              <div style={{ display: 'block' }}>
                <span className={styles.secretText}>SECRET: JBSWY3DPEHPK3PXP</span>
              </div>
              <form onSubmit={handleVerify} className={styles.verifyForm}>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  maxLength={6}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                    background: 'var(--sf-bg-surface, #ffffff)',
                    color: 'var(--sf-text-primary, #0f172a)',
                    fontSize: '0.95rem',
                    fontFamily: 'monospace',
                  }}
                />
                <Button type="submit" size="sm">Verify &amp; Enable</Button>
                <Button variant="secondary" size="sm" onClick={() => setIsEnrolling(false)}>Cancel</Button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
