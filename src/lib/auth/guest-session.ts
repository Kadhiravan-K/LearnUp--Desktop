/**
 * Safe, isolated guest session utilities for LearnUp.
 * Ensures each guest user receives an isolated session UUID and unique storage partition.
 */

export const GUEST_COOKIE_MODE = 'LearnUp_guest_mode';
export const GUEST_COOKIE_SESSION_ID = 'LearnUp_guest_session_id';
export const GUEST_STORAGE_KEY = 'LearnUp_guest_session_id';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a candidate string is a well-formed UUID.
 */
export function isValidGuestSessionId(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

/**
 * Checks whether an internal user ID represents a guest session.
 */
export function isGuestUserId(userId: string | null | undefined): boolean {
  if (!userId || typeof userId !== 'string') return false;
  return userId.startsWith('guest-') || userId === '00000000-0000-0000-0000-000000000001';
}

/**
 * Returns or creates the unique guest session UUID on the client.
 * Stored securely in both document.cookie and localStorage.
 */
export function getOrCreateGuestSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // 1. Try reading from cookie
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE_SESSION_ID}=([^;]+)`));
    if (match && match[1]) {
      const candidate = decodeURIComponent(match[1]).trim();
      if (isValidGuestSessionId(candidate)) {
        document.cookie = `${GUEST_COOKIE_MODE}=true; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `${GUEST_COOKIE_SESSION_ID}=${candidate}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem('LearnUp_is_guest', 'true');
        localStorage.setItem(GUEST_STORAGE_KEY, candidate);
        return candidate;
      }
    }
  } catch {
    // continue
  }

  // 2. Try reading from localStorage
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored && isValidGuestSessionId(stored.trim())) {
      const candidate = stored.trim();
      try {
        document.cookie = `${GUEST_COOKIE_MODE}=true; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `${GUEST_COOKIE_SESSION_ID}=${candidate}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem('LearnUp_is_guest', 'true');
      } catch {
        // continue
      }
      return candidate;
    }
  } catch {
    // continue
  }

  // 3. Generate new cryptographically random UUID v4
  const newId = crypto.randomUUID();
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, newId);
    localStorage.setItem('LearnUp_is_guest', 'true');
    document.cookie = `${GUEST_COOKIE_MODE}=true; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `${GUEST_COOKIE_SESSION_ID}=${newId}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // continue
  }

  return newId;
}

/**
 * Returns the Bearer authorization token for the active guest session.
 * Format: `guest-${uuid}`
 */
export function getGuestAuthToken(): string {
  const sessionId = getOrCreateGuestSessionId();
  return sessionId ? `guest-${sessionId}` : '';
}

/**
 * Clears client guest session credentials when an authenticated user signs in.
 */
export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('LearnUp_is_guest');
    localStorage.removeItem(GUEST_STORAGE_KEY);
    document.cookie = `${GUEST_COOKIE_MODE}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${GUEST_COOKIE_SESSION_ID}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // ignore
  }
}
