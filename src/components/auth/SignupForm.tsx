"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, formatAuthError } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { Alert } from "@/components/ui/Alert/Alert";
import { addOrUpdateSavedProfile } from "@/lib/auth/profileCookies";
import { getOrCreateGuestSessionId } from "@/lib/auth/guest-session";
import Link from "next/link";
import styles from "./SignupForm.module.css";

export function SignupForm() {
  const router = useRouter();

  let supabase: ReturnType<typeof createClient> | null = null;
  let initError: string | null = null;
  try {
    supabase = createClient();
  } catch (e: any) {
    initError = 'Supabase configuration is missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployment environment.';
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/dashboard");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (initError) {
      setError(initError);
      return;
    }
    if (!supabase) return;

    // Client-side validations
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Persist non-sensitive profile metadata to cookies & localStorage for easy profile switching
    try {
      addOrUpdateSavedProfile({
        email,
        name: email.split("@")[0],
      });
    } catch {
      // Ignore
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(formatAuthError(signUpError));
        setIsLoading(false);
        return;
      }

      // Depending on Supabase configuration, sign up might require email confirmation.
      // If a session is returned immediately, redirect to library.
      if (data.session) {
        router.refresh();
        router.push("/library");
      } else {
        // Otherwise, show a success message to check their email.
        setSuccess(
          "Account created! Please check your email to verify your account.",
        );
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.header}>
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>Start building your LearnUp library</p>
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

        {success && (
          <Alert variant="success" className={styles.alert}>
            {success}
          </Alert>
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
            autoFocus
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            disabled={isLoading}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            disabled={isLoading}
            required
          />
        </div>

        <Button
          type="submit"
          className={styles.submitBtn}
          isLoading={isLoading}
        >
          Sign Up
        </Button>

        <div className={styles.footer}>
          Already have an account?{" "}
          <Link href="/login?mode=form" className={styles.link}>
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
