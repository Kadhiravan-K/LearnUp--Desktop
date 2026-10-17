'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UndoProvider } from '@/lib/context/UndoContext';
import { FocusTimerProvider } from '@/lib/context/FocusTimerContext';
import { FirstLaunchWizard } from '@/components/setup/FirstLaunchWizard';
import styles from './AppShell.module.css';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFirstLaunchOpen, setIsFirstLaunchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('learnup_first_launch_completed_v1');
      if (!completed) {
        setIsFirstLaunchOpen(true);
      }
    }
  }, []);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Handle escape key to close mobile sidebar
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    },
    [isSidebarOpen]
  );

  useEffect(() => {
    if (isSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent background scrolling on mobile when sidebar drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen, handleKeyDown]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <UndoProvider>
      <FocusTimerProvider>
        <div className={styles.container}>
          {/* Mobile Drawer Backdrop */}
          {isSidebarOpen && (
            <div
              className={`${styles.backdrop} ${styles.backdropActive}`}
              onClick={closeSidebar}
              aria-hidden="true"
              data-testid="sidebar-backdrop"
            />
          )}

          {/* Responsive Sidebar */}
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

          {/* Main Content Area */}
          <div className={styles.mainWrapper}>
            <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
            <main className={styles.content} id="main-content">
              {children}
            </main>
          </div>
        </div>

        <FirstLaunchWizard
          isOpen={isFirstLaunchOpen}
          onComplete={() => setIsFirstLaunchOpen(false)}
        />
      </FocusTimerProvider>
    </UndoProvider>
  );
}
