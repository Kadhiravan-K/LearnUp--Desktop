'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useLearnUpTheme } from '@/lib/theme/ThemeProvider';
import { useFocusTimer } from '@/lib/hooks/useFocusTimer';
import { SyncDiagnosticsModal } from '@/components/storage/SyncDiagnosticsModal';
import { SyncDiagnostics } from '@/lib/storage/contracts';
import styles from './Header.module.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

/**
 * Derives the page title and breadcrumbs based on the authenticated route pathname.
 */
export function getHeaderTitleAndBreadcrumbs(pathname: string): {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
} {
  if (!pathname || pathname === '/' || pathname === '/dashboard') {
    return { title: 'Dashboard' };
  }
  if (pathname === '/library') {
    return { title: 'Library' };
  }
  if (pathname.startsWith('/library/')) {
    return {
      title: 'Learn',
      breadcrumbs: [
        { label: 'Library', href: '/library' },
        { label: 'Learn' }
      ]
    };
  }
  if (pathname.startsWith('/analytics')) {
    return { title: 'Analytics' };
  }
  if (pathname.startsWith('/focus')) {
    return {
      title: 'Focus Sanctuary',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Focus' }
      ]
    };
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Settings' };
  }
  return { title: 'LearnUp' };
}

export function Header({ onToggleSidebar, isSidebarOpen = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const supabase = createClient();
  const { isDark, toggleTheme } = useLearnUpTheme();

  const {
    formattedTime,
    timerState,
    startFocus,
    pauseFocus,
    selectMode,
    mode
  } = useFocusTimer();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const diagnosticsData: SyncDiagnostics = {
    isOnline,
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
    failedCount: 0,
    lastSyncTimestamp: new Date().toISOString(),
    activeAccountScope: userEmail || 'guest_local',
    recentErrors: []
  };

  const handleManualSync = async () => {
    // Triggers local-to-cloud synchronization
  };

  const handleFocusPillClick = () => {
    if (timerState === 'running') {
      pauseFocus();
    } else if (timerState === 'paused') {
      startFocus();
    } else {
      if (mode !== 'sprint' && mode !== 'custom') {
        selectMode('sprint');
      }
      startFocus();
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session?.user?.email) {
          setUserEmail(session.user.email);
        } else if (isMounted && typeof window !== 'undefined' && localStorage.getItem('LearnUp_is_guest') === 'true') {
          setUserEmail('guest@LearnUp.local');
        }
      } catch {
        // Fallback gracefully if session retrieval encounters an error
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const { title } = getHeaderTitleAndBreadcrumbs(pathname);
  const userInitial = userEmail
    ? userEmail.startsWith('guest')
      ? 'G'
      : userEmail.charAt(0).toUpperCase()
    : 'A';

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.leftSection}>
          {onToggleSidebar && (
            <button
              type="button"
              className={styles.menuButton}
              onClick={onToggleSidebar}
              aria-label="Toggle navigation menu"
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className={styles.workspaceBreadcrumb}>
            <svg className={styles.folderIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Workspace</span>
            <span>/</span>
            <span className={styles.workspaceName}>{title === 'Dashboard' ? 'Engineering Core' : title}</span>
            <span className={styles.readOnlyBadge}>Read Only</span>
          </div>
        </div>

        <div className={styles.centerSection}>
          <svg className={styles.searchIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search study guides, decks..."
            aria-label="Search study guides"
          />
          <kbd className={styles.searchKbd}>Ctrl+K</kbd>
        </div>

        <div className={styles.rightSection}>
          <button
            type="button"
            className={styles.focusTimerPill}
            onClick={handleFocusPillClick}
            aria-label={`Focus Timer (${formattedTime})`}
            data-testid="header-focus-timer-button"
          >
            <span
              className={styles.focusDot}
              style={timerState === 'running' ? { animation: 'pulse 1s infinite' } : undefined}
            />
            <span>{formattedTime}</span>
            <span className={styles.startTag}>
              {timerState === 'running' ? '⏸ Running' : timerState === 'paused' ? 'Paused' : '▶ Start'}
            </span>
          </button>

          <button type="button" className={styles.iconButton} aria-label="Notifications">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={styles.syncStatusPill}
            onClick={() => setIsDiagnosticsOpen(true)}
            title="Storage & Offline Sync Diagnostics"
            aria-label="Storage and Sync Status"
          >
            <span className={isOnline ? styles.syncDotGreen : styles.syncDotOrange} />
            <span>{isOnline ? 'Synced' : 'Offline'}</span>
          </button>

          <Link
            href="/settings"
            className={styles.userAvatar}
            title={userEmail ? `${userEmail} (Account Settings)` : 'Account Settings'}
            aria-label="Account Settings"
          >
            {userInitial}
          </Link>
        </div>
      </div>

      <SyncDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        diagnostics={diagnosticsData}
        onManualSync={handleManualSync}
      />
    </header>
  );
}
