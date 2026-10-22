'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileChooser } from './ProfileChooser';
import { LoginForm } from './LoginForm';

import { getOrCreateGuestSessionId } from '@/lib/auth/guest-session';
import { createClient } from '@/lib/supabase/browser';

export interface AuthLoginClientProps {
  onSelectProfile?: (profileId: string) => void;
  onSelectGuest?: () => void;
}

export function AuthLoginClient({ onSelectProfile, onSelectGuest }: AuthLoginClientProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFormMode = searchParams?.get('mode') === 'form';
  const [view, setView] = useState<'profiles' | 'login'>(isFormMode ? 'login' : 'profiles');
  const [selectedEmail, setSelectedEmail] = useState('');

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('mode') === 'form' || searchParams?.get('mode') === 'form') {
      setView('login');
    }
  }, [searchParams]);

  const handleSelectSignIn = (email?: string) => {
    setSelectedEmail(email || '');
    setView('login');
  };

  const handleSelectSignUp = () => {
    router.push('/signup');
  };

  const handleSelectGuest = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    const guestId = getOrCreateGuestSessionId();
    document.cookie = 'LearnUp_guest_mode=true; path=/; max-age=31536000; SameSite=Lax';
    document.cookie = `LearnUp_guest_session_id=${guestId}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem('LearnUp_is_guest', 'true');
      localStorage.setItem('LearnUp_guest_session_id', guestId);
    } catch {
      // Ignore
    }
    if (onSelectGuest) {
      onSelectGuest();
    } else {
      router.push('/dashboard');
    }
  };

  if (view === 'login') {
    return (
      <LoginForm
        initialEmail={selectedEmail}
        onBackToProfiles={() => setView('profiles')}
      />
    );
  }

  return (
    <ProfileChooser
      onSelectSignIn={handleSelectSignIn}
      onSelectSignUp={handleSelectSignUp}
      onSelectGuest={handleSelectGuest}
      onSelectProfile={onSelectProfile}
    />
  );
}
