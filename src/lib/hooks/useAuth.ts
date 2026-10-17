'use client';

import { useState, useEffect } from 'react';
import { createClient, type User, type Session } from '@/lib/supabase/browser';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If client is in guest mode, resolve auth loading immediately
    if (typeof window !== 'undefined' && localStorage.getItem('LearnUp_is_guest') === 'true') {
      setIsLoading(false);
    }

    const supabase = createClient();

    // Fetch initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    // Subscribe to ongoing session/auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return { user, session, isLoading, signOut };
}
