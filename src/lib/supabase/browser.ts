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
