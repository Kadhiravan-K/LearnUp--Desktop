export interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface Session {
  user: User;
  access_token?: string | null;
  [key: string]: any;
}

export function createClient() {
  return {
    auth: {
      getSession: async (): Promise<{ data: { session: Session | null }; error: Error | null }> => {
        try {
          const profileRaw = localStorage.getItem('learnup_active_profile_v1');
          if (profileRaw) {
            const profile = JSON.parse(profileRaw);
            if (profile.email) {
              return { data: { session: { user: { email: profile.email, id: profile.id }, access_token: 'local_token' } }, error: null };
            }
          }
        } catch {}
        return { data: { session: null }, error: null };
      },
      signOut: async () => {
        return { error: null };
      },
      signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
        return {
          data: {
            user: { id: `user_${Date.now()}`, email },
            session: { user: { id: `user_${Date.now()}`, email }, access_token: 'local_token' },
          },
          error: null,
        };
      },
      signUp: async ({ email, password }: { email: string; password?: string }) => {
        return {
          data: {
            user: { id: `user_${Date.now()}`, email },
            session: { user: { id: `user_${Date.now()}`, email }, access_token: 'local_token' },
          },
          error: null,
        };
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] },
          error: null,
        }),
        listFactors: async () => ({ data: { totp: [] as any[] }, error: null }),
        challenge: async (_args: any) => ({ data: { id: 'mock_challenge' }, error: null }),
        verify: async (_args: any) => ({ data: null, error: null }),
        challengeAndVerify: async (_args: any) => ({ data: null, error: null }),
      },
      onAuthStateChange: (_callback: (event: string, session: Session | null) => void) => {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  };
}

export function formatAuthError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
