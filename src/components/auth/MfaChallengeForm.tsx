'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import styles from './LoginForm.module.css';

export interface Factor {
  id: string;
  factor_type: string;
  status: string;
  [key: string]: any;
}
export interface MfaChallengeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function MfaChallengeForm({ onSuccess, onCancel }: MfaChallengeFormProps) {
  const supabase = createClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);

  useEffect(() => {
    const initMfa = async () => {
      try {
        const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        
        const totpFactors = data?.totp || [];
        setFactors(totpFactors);

        if (totpFactors.length > 0) {
          const factorId = totpFactors[0].id;
          setSelectedFactorId(factorId);
          
          const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
          if (challengeError) throw challengeError;
          
          setChallengeId(data.id);
        } else {
          setError('No verified MFA factors found for this account.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize MFA challenge.');
      }
    };
    initMfa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !challengeId || !selectedFactorId) return;

    setError(null);
    setIsLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: selectedFactorId,
        challengeId,
        code
      });

      if (verifyError) {
        setError((verifyError as any)?.message || 'Verification error');
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <button
          type="button"
          onClick={onCancel}
          className={styles.backBtn}
          aria-label="Cancel"
        >
          &larr; Cancel
        </button>

        <div className={styles.header}>
          <h1 className={styles.title}>Two-Factor Auth</h1>
          <p className={styles.subtitle}>Enter the 6-digit code from your authenticator app.</p>
        </div>

        {error && (
          <Alert variant="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        <div className={styles.fields}>
          <Input
            label="Authentication Code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            autoComplete="one-time-code"
            disabled={isLoading || !challengeId}
            autoFocus
            required
            style={{ letterSpacing: '0.2em', fontSize: '1.25rem', textAlign: 'center' }}
          />
        </div>

        <Button type="submit" className={styles.submitBtn} isLoading={isLoading} disabled={!challengeId || code.length < 6}>
          Verify Code
        </Button>
      </form>
    </div>
  );
}
