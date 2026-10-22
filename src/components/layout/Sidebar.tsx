'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { BrowseTemplatesModal } from '@/components/templates/BrowseTemplatesModal';
import { useWorkspaces } from '@/lib/hooks/useWorkspaces';
import { useModuleManager } from '@/lib/hooks/useModuleManager';
import { Workspace } from '@/lib/types';
import { clearGuestSession } from '@/lib/auth/guest-session';
import { UserProfile } from '@/core';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeProfile?: UserProfile | null;
  onSignOut?: () => void;
}

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  moduleId?: string;
  icon: (props: { className?: string }) => React.ReactNode;
  isActive: (pathname: string) => boolean;
}

const AVAILABLE_ICONS = ['📚', '💻', '🎯', '🧪', '🎨', '🚀', '⚡', '📖', '🔬', '🧠'];

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    moduleId: 'core-dashboard',
    isActive: (pathname: string) => pathname === '/dashboard' || pathname === '/',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    label: 'Library',
    href: '/library',
    badge: '12',
    moduleId: 'core-library',
    isActive: (pathname: string) => pathname === '/library',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    label: 'Learn',
    href: '/library',
    moduleId: 'core-player',
    isActive: (pathname: string) => pathname.startsWith('/library/') && pathname !== '/library',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    label: 'Analytics',
    href: '/analytics',
    badge: 'Hub',
    moduleId: 'mod-skills',
    isActive: (pathname: string) => pathname.startsWith('/analytics'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    label: 'Roadmaps',
    href: '/roadmaps',
    badge: 'Active',
    moduleId: 'mod-career-roadmaps',
    isActive: (pathname: string) => pathname.startsWith('/roadmaps'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )
  },
  {
    label: 'Focus',
    href: '/focus',
    badge: '7d streak',
    moduleId: 'mod-focus-timer',
    isActive: (pathname: string) => pathname.startsWith('/focus'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    label: 'Settings',
    href: '/settings',
    moduleId: 'core-settings',
    isActive: (pathname: string) => pathname.startsWith('/settings'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

export const ADDITIONAL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Skills',
    href: '/skills',
    badge: '#',
    moduleId: 'mod-skills',
    isActive: (pathname: string) => pathname.startsWith('/skills'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  {
    label: 'Notes',
    href: '/notes',
    badge: 'Hub',
    moduleId: 'core-notes',
    isActive: (pathname: string) => pathname.startsWith('/notes'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    label: 'Planner',
    href: '/calendar',
    badge: '3 due',
    moduleId: 'mod-calendar',
    isActive: (pathname: string) => pathname.startsWith('/calendar'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    label: 'Rewards',
    href: '/rewards',
    badge: 'XP',
    moduleId: 'mod-focus-timer',
    isActive: (pathname: string) => pathname.startsWith('/rewards'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    )
  },
  {
    label: 'AI Assistant',
    href: '/assistant',
    badge: 'Beta',
    moduleId: 'mod-ai-assistant',
    isActive: (pathname: string) => pathname.startsWith('/assistant'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  }
];

export function Sidebar({ isOpen = false, onClose, activeProfile, onSignOut }: SidebarProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Desktop Collapsible state (hydrated safely after mount to prevent SSR mismatches)
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('learnup_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Safe fallback
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('learnup_sidebar_collapsed', String(next));
      } catch {
        // Safe fallback
      }
      return next;
    });
  };

  // Real persistent workspace state
  const {
    workspaces,
    activeWorkspace,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace
  } = useWorkspaces();

  // Modular state filtering
  const { isModuleEnabled } = useModuleManager();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.moduleId || isModuleEnabled(item.moduleId));
  const visibleAdditionalItems = ADDITIONAL_NAV_ITEMS.filter((item) => !item.moduleId || isModuleEnabled(item.moduleId));

  // Workspace UI states
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState('📚');

  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState('');
  const [editWorkspaceIcon, setEditWorkspaceIcon] = useState('📚');

  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session?.user?.email) {
          setUserEmail(session.user.email);
        }
      } catch {
        // Safe fallback
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      clearGuestSession();
      if (supabase?.auth?.signOut) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((resolve) => setTimeout(resolve, 600))
        ]).catch(() => {});
      }
    } catch (e) {
      console.warn('Sign out cleanup caught:', e);
    } finally {
      if (onSignOut) {
        onSignOut();
      } else {
        router.push('/login');
      }
    }
  };

  const handleSelectWorkspace = (id: string) => {
    selectWorkspace(id);
    setIsWorkspaceMenuOpen(false);
  };

  const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      await createWorkspace({ name: newWorkspaceName.trim(), icon: newWorkspaceIcon });
      setNewWorkspaceName('');
      setNewWorkspaceIcon('📚');
      setIsCreatingWorkspace(false);
      setIsWorkspaceMenuOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create workspace');
    }
  };

  const handleOpenEditModal = (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkspace(ws);
    setEditWorkspaceName(ws.name);
    setEditWorkspaceIcon(ws.icon || '📚');
    setIsWorkspaceMenuOpen(false);
  };

  const handleEditWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || !editWorkspaceName.trim()) return;
    try {
      await updateWorkspace(editingWorkspace.id, {
        name: editWorkspaceName.trim(),
        icon: editWorkspaceIcon
      });
      setEditingWorkspace(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update workspace');
    }
  };

  const handleOpenDeleteModal = (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToDelete(ws);
    setDeleteError(null);
    setIsWorkspaceMenuOpen(false);
  };

  const handleDeleteWorkspaceSubmit = async () => {
    if (!workspaceToDelete) return;
    if (workspaces.length <= 1) {
      setDeleteError('Cannot delete your only workspace. At least one workspace is required.');
      return;
    }
    try {
      await deleteWorkspace(workspaceToDelete.id);
      setWorkspaceToDelete(null);
      setDeleteError(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete workspace');
    }
  };

  const userName = activeProfile?.name || (userEmail ? userEmail.split('@')[0] : 'Learner');
  const userDisplayEmail = activeProfile?.email || activeProfile?.cloudUserEmail || userEmail || 'guest@learnup.local';
  const userInitial = activeProfile?.initials || userName.charAt(0).toUpperCase();

  const activeName = activeWorkspace ? activeWorkspace.name : 'Personal Study Vault';
  const activeIcon = activeWorkspace ? activeWorkspace.icon : '📚';

  return (
    <>
      <aside
        id="app-sidebar"
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}
        aria-label="Application Sidebar"
      >
        <div className={styles.topSection}>
          <div className={`${styles.header} ${isCollapsed ? styles.headerCollapsed : ''}`}>
            {!isCollapsed ? (
              <Link href="/dashboard" className={styles.brand} onClick={onClose}>
                <div className={styles.brandLogo}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span>LearnUp</span>
                <button
                  type="button"
                  className={styles.proBadgeBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsUpgradeModalOpen(true);
                  }}
                  title="View Pro Subscription"
                >
                  Pro ↕
                </button>
              </Link>
            ) : (
              <Link href="/dashboard" className={styles.brandCollapsed} onClick={onClose} title="LearnUp Pro Workspace">
                <div className={styles.brandLogo}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
              </Link>
            )}

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.collapseToggleBtn}
                onClick={toggleCollapse}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!isCollapsed}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={isCollapsed ? styles.rotate180 : ''}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close navigation"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Persistent Workspace Selector & Popover */}
          <div className={styles.workspaceWrapper}>
            <button
              type="button"
              className={`${styles.workspaceSelector} ${isCollapsed ? styles.workspaceSelectorCollapsed : ''}`}
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="true"
              aria-label={`Select study workspace: ${activeName}`}
              title={isCollapsed ? `Workspace: ${activeName}` : undefined}
            >
              <div className={styles.workspaceText}>
                <span className={styles.workspaceIcon}>{activeIcon}</span>
                {!isCollapsed && <span className={styles.activeWorkspaceLabel}>{activeName}</span>}
              </div>
              {!isCollapsed && (
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className={`${styles.dropdownChevron} ${isWorkspaceMenuOpen ? styles.dropdownChevronOpen : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {isWorkspaceMenuOpen && (
              <div className={`${styles.workspaceMenu} ${isCollapsed ? styles.workspaceMenuCollapsed : ''}`} role="menu">
                <div className={styles.workspaceMenuHeader}>Workspaces</div>
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    role="menuitem"
                    tabIndex={0}
                    className={`${styles.workspaceMenuItem} ${ws.id === activeWorkspace?.id ? styles.workspaceMenuItemActive : ''}`}
                    onClick={() => handleSelectWorkspace(ws.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelectWorkspace(ws.id);
                      }
                    }}
                  >
                    <div className={styles.workspaceItemLeft}>
                      <span className={styles.workspaceIcon}>{ws.icon}</span>
                      <span className={styles.workspaceItemName}>{ws.name}</span>
                    </div>

                    <div className={styles.workspaceItemRight}>
                      {ws.id === activeWorkspace?.id && (
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <button
                        type="button"
                        className={styles.wsActionBtn}
                        onClick={(e) => handleOpenEditModal(ws, e)}
                        title="Edit Workspace"
                        aria-label={`Edit ${ws.name}`}
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={`${styles.wsActionBtn} ${styles.wsActionBtnDelete}`}
                        onClick={(e) => handleOpenDeleteModal(ws, e)}
                        title="Delete Workspace"
                        aria-label={`Delete ${ws.name}`}
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                <div className={styles.workspaceMenuDivider} />

                {isCreatingWorkspace ? (
                  <form onSubmit={handleCreateWorkspaceSubmit} className={styles.createWorkspaceForm}>
                    <input
                      type="text"
                      placeholder="Workspace name..."
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      className={styles.newWorkspaceInput}
                      autoFocus
                    />
                    <div className={styles.iconPickerGrid}>
                      {AVAILABLE_ICONS.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          className={`${styles.iconOption} ${newWorkspaceIcon === ic ? styles.iconOptionActive : ''}`}
                          onClick={() => setNewWorkspaceIcon(ic)}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                    <div className={styles.createWorkspaceActions}>
                      <button type="submit" className={styles.saveWorkspaceBtn} disabled={!newWorkspaceName.trim()}>
                        Create
                      </button>
                      <button
                        type="button"
                        className={styles.cancelWorkspaceBtn}
                        onClick={() => {
                          setIsCreatingWorkspace(false);
                          setNewWorkspaceName('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.createWorkspaceBtn}
                    onClick={() => setIsCreatingWorkspace(true)}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New Workspace</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  className={styles.upgradePlanBtn}
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    setIsUpgradeModalOpen(true);
                  }}
                >
                  <span>⚡ Upgrade Plan</span>
                  <span className={styles.planBadge}>Pro</span>
                </button>
              </div>
            )}
          </div>

          <nav className={styles.nav} aria-label="Main Navigation">
            <ul className={styles.navList}>
              {visibleNavItems.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                const tooltipText = item.badge ? `${item.label} (${item.badge})` : item.label;
                const lastItemId = typeof window !== 'undefined' ? localStorage.getItem('learnup_last_learning_item_id') : null;
                const targetHref = item.label === 'Learn' && lastItemId ? `/library/${lastItemId}` : item.href;
                return (
                  <li key={item.label} className={styles.navItem}>
                    <button
                      type="button"
                      data-href={targetHref}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ''} ${isCollapsed ? styles.navLinkCollapsed : ''}`}
                      aria-current={active ? 'page' : undefined}
                      aria-label={tooltipText}
                      title={isCollapsed ? tooltipText : undefined}
                      onClick={() => {
                        if (onClose) onClose();
                        router.push(targetHref);
                      }}
                    >
                      <div className={styles.navLinkLeft}>
                        <Icon className={styles.navIcon} />
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                      {!isCollapsed && item.badge && <span className={styles.badge}>{item.badge}</span>}
                    </button>
                  </li>
                );
              })}

              {visibleAdditionalItems.length > 0 && (
                !isCollapsed ? (
                  <li className={styles.sectionHeader}>
                    Learning Hubs
                  </li>
                ) : (
                  <li className={styles.sectionHeaderCollapsed} aria-hidden="true">
                    <div className={styles.sectionHeaderDivider} />
                  </li>
                )
              )}

              {visibleAdditionalItems.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                const tooltipText = item.badge ? `${item.label} (${item.badge})` : item.label;
                return (
                  <li key={item.label} className={styles.navItem}>
                    <button
                      type="button"
                      data-href={item.href}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ''} ${isCollapsed ? styles.navLinkCollapsed : ''}`}
                      aria-current={active ? 'page' : undefined}
                      aria-label={tooltipText}
                      title={isCollapsed ? tooltipText : undefined}
                      onClick={() => {
                        if (onClose) onClose();
                        router.push(item.href);
                      }}
                    >
                      <div className={styles.navLinkLeft}>
                        <Icon className={styles.navIcon} />
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                      {!isCollapsed && item.badge && <span className={styles.badge}>{item.badge}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className={styles.bottomSection}>
          <button
            type="button"
            className={`${styles.browseTemplatesBtn} ${isCollapsed ? styles.browseTemplatesBtnCollapsed : ''}`}
            onClick={() => setIsTemplatesModalOpen(true)}
            aria-label="Browse Community Blueprints & Templates"
            title={isCollapsed ? "Browse Templates (Explore)" : undefined}
          >
            <div className={styles.browseTemplatesLeft}>
              <span>🧭</span>
              {!isCollapsed && <span>Browse Templates</span>}
            </div>
            {!isCollapsed && <span className={styles.browseTemplatesBadge}>Explore</span>}
          </button>

          <div className={`${styles.userCard} ${isCollapsed ? styles.userCardCollapsed : ''}`}>
            <Link
              href="/settings"
              className={styles.userLeft}
              title={isCollapsed ? `${userName} (${userDisplayEmail}) - Settings` : 'Account Settings'}
              style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <div className={styles.userAvatar} style={activeProfile?.color ? { background: activeProfile.color } : undefined}>
                {userInitial}
              </div>
              {!isCollapsed && (
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{userName}</span>
                  <span className={styles.userEmail}>{userDisplayEmail}</span>
                </div>
              )}
            </Link>
            {!isCollapsed && (
              <button
                type="button"
                className={styles.signOutBtn}
                onClick={handleSignOut}
                aria-label={activeProfile?.email ? "Sign out" : "Exit Guest Workspace"}
                title={activeProfile?.email ? "Sign out" : "Exit Guest Workspace"}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <div className={styles.modalBackdrop} onClick={() => setEditingWorkspace(null)}>
          <div className={styles.workspaceModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.workspaceModalTitle}>Edit Workspace</h3>
            <form onSubmit={handleEditWorkspaceSubmit} className={styles.createWorkspaceForm}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sf-color-text-secondary)' }}>
                Workspace Name
              </label>
              <input
                type="text"
                placeholder="Workspace name..."
                value={editWorkspaceName}
                onChange={(e) => setEditWorkspaceName(e.target.value)}
                className={styles.newWorkspaceInput}
                autoFocus
              />
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sf-color-text-secondary)', marginTop: '4px' }}>
                Icon
              </label>
              <div className={styles.iconPickerGrid}>
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    className={`${styles.iconOption} ${editWorkspaceIcon === ic ? styles.iconOptionActive : ''}`}
                    onClick={() => setEditWorkspaceIcon(ic)}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <div className={styles.createWorkspaceActions} style={{ marginTop: '12px' }}>
                <button type="submit" className={styles.saveWorkspaceBtn} disabled={!editWorkspaceName.trim()}>
                  Save Changes
                </button>
                <button
                  type="button"
                  className={styles.cancelWorkspaceBtn}
                  onClick={() => setEditingWorkspace(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {workspaceToDelete && (
        <div className={styles.modalBackdrop} onClick={() => setWorkspaceToDelete(null)}>
          <div className={styles.workspaceModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.workspaceModalTitle}>Delete Workspace</h3>
            <p style={{ fontSize: '13px', color: 'var(--sf-color-text-secondary)', margin: 0 }}>
              Are you sure you want to delete <strong>{workspaceToDelete.name}</strong>?
            </p>

            {deleteError && (
              <div className={styles.errorBanner}>
                {deleteError}
              </div>
            )}

            <div className={styles.createWorkspaceActions} style={{ marginTop: '8px' }}>
              <button
                type="button"
                className={styles.saveWorkspaceBtn}
                style={{ backgroundColor: 'var(--sf-color-error)' }}
                onClick={handleDeleteWorkspaceSubmit}
                disabled={workspaces.length <= 1}
              >
                Delete Workspace
              </button>
              <button
                type="button"
                className={styles.cancelWorkspaceBtn}
                onClick={() => setWorkspaceToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Templates Browser Modal */}
      <BrowseTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        activeProfileId={activeProfile?.id}
      />

      {/* Upgrade Plan Modal */}
      {isUpgradeModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsUpgradeModalOpen(false)}>
          <div className={styles.upgradeModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.upgradeModalHeader}>
              <div className={styles.upgradeIcon}>⚡</div>
              <div>
                <h3 className={styles.upgradeTitle}>LearnUp Pro Workspace</h3>
                <p className={styles.upgradeSubtitle}>Unlimited personal & domain-agnostic workspaces, cloud sync, and AI copilot.</p>
              </div>
            </div>

            <div className={styles.upgradeFeatures}>
              <div className={styles.upgradeFeatureItem}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited workspaces across all learning domains</span>
              </div>
              <div className={styles.upgradeFeatureItem}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Local-first zero-telemetry vault storage</span>
              </div>
              <div className={styles.upgradeFeatureItem}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Full access to community & core educational plugins</span>
              </div>
            </div>

            <div className={styles.upgradeActions}>
              <button
                type="button"
                className={styles.upgradeActiveBtn}
                onClick={() => setIsUpgradeModalOpen(false)}
              >
                Current Plan (Active Free Tier)
              </button>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsUpgradeModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
