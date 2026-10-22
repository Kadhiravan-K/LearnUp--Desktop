'use client';

import React, { useState, useEffect } from 'react';
import { createClient, formatAuthError } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import { addOrUpdateSavedProfile } from '@/lib/auth/profileCookies';
import { clearGuestSession, getOrCreateGuestSessionId } from '@/lib/auth/guest-session';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './LoginForm.module.css';
import { MfaChallengeForm } from './MfaChallengeForm';

export interface LoginFormProps {
  initialEmail?: string;
  onBackToProfiles?: () => void;
}

export function LoginForm({
  initialEmail = '',
  onBackToProfiles
}: LoginFormProps) {
  const router = useRouter();
  let supabase: ReturnType<typeof createClient> | null = null;
  let initError: string | null = null;
  try {
    supabase = createClient();
  } catch (e: any) {
    initError = 'Supabase configuration is missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployment environment.';
  }

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [pendingSessionData, setPendingSessionData] = useState<any>(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSuccess = (data: any) => {
    try {
      addOrUpdateSavedProfile({
        id: data.session?.user?.id || String(Date.now()),
        email: email,
        name: email.split('@')[0],
      });
      clearGuestSession();
    } catch {
      // Ignore
    }
    clearGuestSession();
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (initError) {
      setError(initError);
      return;
    }
    if (!supabase) return;

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Persist non-sensitive profile metadata to cookies & localStorage for easy profile switching
    try {
      addOrUpdateSavedProfile({
        email: email,
        name: email.split('@')[0],
      });
    } catch {
      // Ignore
    }

    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(formatAuthError(signInError));
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Check if MFA is required
        const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!mfaError && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
          setPendingSessionData(data);
          setShowMfa(true);
          setIsLoading(false);
          return;
        }

        handleSuccess(data);
      } else {
        setError('Login succeeded but no session was returned. Please verify your account.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
      setIsLoading(false);
    }
  };

  if (showMfa) {
    return (
      <MfaChallengeForm 
        onSuccess={() => handleSuccess(pendingSessionData)} 
        onCancel={() => { setShowMfa(false); setIsLoading(false); }} 
      />
    );
  }

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {onBackToProfiles && (
          <button
            type="button"
            onClick={onBackToProfiles}
            className={styles.backBtn}
            aria-label="Back to Profiles"
          >
            &larr; Back to Profiles
          </button>
        )}

        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your LearnUp workspace</p>
        </div>

        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            <Alert variant="error" className={styles.alert}>
              {error}
            </Alert>
            {error.includes('Local Supabase is not running') && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const guestId = getOrCreateGuestSessionId();
                  document.cookie = 'LearnUp_guest_mode=true; path=/; max-age=86400; SameSite=Lax';
                  document.cookie = `LearnUp_guest_session_id=${guestId}; path=/; max-age=86400; SameSite=Lax`;
                  try {
                    localStorage.setItem('LearnUp_is_guest', 'true');
                    localStorage.setItem('LearnUp_guest_session_id', guestId);
                  } catch {
                    // Ignore
                  }
                  window.location.href = '/dashboard';
                }}
              >
                Enter Guest Mode Immediately &rarr;
              </Button>
            )}
          </div>
        )}

        <div className={styles.fields}>
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoading}
            autoFocus={!initialEmail}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isLoading}
            autoFocus={Boolean(initialEmail)}
            required
          />
        </div>

        <Button type="submit" className={styles.submitBtn} isLoading={isLoading}>
          Sign In
        </Button>

        <div className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className={styles.link}>
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
