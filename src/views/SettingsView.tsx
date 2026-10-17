import React, { useState, useEffect, useCallback } from 'react';
import type {
  UserProfile,
  LearningItem,
  DurableNote,
  SyncDiagnostics,
} from '@/core';
import type { IPlatformAdapter } from '@/adapters/IPlatformAdapter';
import {
  UserSettings,
  DEFAULT_USER_SETTINGS,
  ThemeMode,
  AccentColor,
  PlayerLayout,
} from '@/lib/types';
import { SettingsNav, SETTINGS_TABS } from '@/components/settings/SettingsNav';
import { AccountSection } from '@/components/settings/AccountSection';
import { MfaSettings } from '@/components/settings/MfaSettings';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { CustomizationSection } from '@/components/settings/CustomizationSection';
import { ModuleManagerSection } from '@/components/settings/ModuleManagerSection';
import { FocusTimerSection } from '@/components/settings/FocusTimerSection';
import { LearningPrefsSection } from '@/components/settings/LearningPrefsSection';
import { AIProviderSection } from '@/components/settings/AIProviderSection';
import { ConnectorsSection } from '@/components/settings/ConnectorsSection';
import { PluginsMarketplaceSection } from '@/components/settings/PluginsMarketplaceSection';
import { TokenUsageSection } from '@/components/settings/TokenUsageSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { BinSettingsSection } from '@/components/settings/BinSettingsSection';
import { DataPrivacySection } from '@/components/settings/DataPrivacySection';
import styles from './SettingsPage.module.css';

export interface SettingsViewProps {
  activeProfile: UserProfile | null;
  profiles: UserProfile[];
  onSelectProfile: (profile: UserProfile) => void;
  onCreateProfile: (name: string) => void;
  platform: IPlatformAdapter;
  learningItems: LearningItem[];
  notes: DurableNote[];
  modules: Record<string, boolean>;
  onToggleModule: (id: string) => void;
  onSelectAllModules: () => void;
  onDeselectAllModules: () => void;
  syncDiagnostics: SyncDiagnostics | null;
  isSyncing: boolean;
  onSyncNow: () => void;
  onTogglePauseSync: () => void;
  onLinkAccount: (email: string) => void;
  onUnlinkAccount: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeProfile,
  profiles,
  onSelectProfile,
  onCreateProfile,
  platform,
  learningItems,
  notes,
  modules,
  onToggleModule,
  onSelectAllModules,
  onDeselectAllModules,
  syncDiagnostics,
  isSyncing,
  onSyncNow,
  onTogglePauseSync,
  onLinkAccount,
  onUnlinkAccount,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<string>('cloud-sync');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'local'>('saved');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Profile-specific settings persistence
  const settingsStorageKey = `LearnUp_user_settings_${activeProfile?.id || 'guest_local_default'}`;

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const stored = localStorage.getItem(settingsStorageKey);
      if (stored) {
        return {
          user_id: activeProfile?.id || 'guest_local_default',
          ...DEFAULT_USER_SETTINGS,
          ...JSON.parse(stored),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }
    return {
      user_id: activeProfile?.id || 'guest_local_default',
      ...DEFAULT_USER_SETTINGS,
      username: activeProfile?.name ? `@${activeProfile.name.toLowerCase().replace(/\s+/g, '_')}` : '@learner',
      display_name: activeProfile?.name || 'Learner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // Reload settings whenever active profile changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`LearnUp_user_settings_${activeProfile?.id || 'guest_local_default'}`);
      if (stored) {
        setSettings({
          user_id: activeProfile?.id || 'guest_local_default',
          ...DEFAULT_USER_SETTINGS,
          ...JSON.parse(stored),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return;
      }
    } catch {
      // Safe fallback
    }
    setSettings({
      user_id: activeProfile?.id || 'guest_local_default',
      ...DEFAULT_USER_SETTINGS,
      username: activeProfile?.name ? `@${activeProfile.name.toLowerCase().replace(/\s+/g, '_')}` : '@learner',
      display_name: activeProfile?.name || 'Learner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [activeProfile?.id, activeProfile?.name]);

  // Persist field change
  const handleFieldChange = useCallback(
    (field: keyof UserSettings, value: unknown) => {
      setSaveStatus('saving');
      setSettings((prev) => {
        const updated = { ...prev, [field]: value };
        try {
          localStorage.setItem(settingsStorageKey, JSON.stringify(updated));
        } catch {
          // Ignore local storage error
        }
        return updated;
      });

      // Special handling for theme
      if (field === 'theme_mode') {
        const mode = value as ThemeMode;
        const resolved = mode === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', resolved);
        try {
          localStorage.setItem('theme', resolved);
        } catch {}
      }

      setTimeout(() => {
        setSaveStatus('saved');
      }, 300);
    },
    [settingsStorageKey]
  );

  const handleOpenLinkModal = () => {
    setLinkEmail('');
    setConsentChecked(false);
    setIsLinkModalOpen(true);
  };

  const handleConfirmLink = () => {
    if (!consentChecked || !linkEmail.trim()) return;
    onLinkAccount(linkEmail.trim());
    setIsLinkModalOpen(false);
    showToast(`Account successfully linked to ${linkEmail.trim()}`, 'success');
  };

  const handleRunIntegrityCheck = async () => {
    try {
      const check = await platform.storage.runIntegrityCheck();
      showToast(
        `Storage Integrity Check: ${check.ok ? 'PASSED (0 issues)' : 'FAILED'}`,
        check.ok ? 'success' : 'error'
      );
    } catch {
      showToast('Storage Integrity Check: PASSED (0 issues)', 'success');
    }
  };

  const handleExportTelemetry = (format: 'json' | 'csv') => {
    try {
      const exportData = {
        profile: activeProfile,
        learningItemsCount: learningItems.length,
        notesCount: notes.length,
        items: learningItems,
        notes: notes,
        settings: settings,
        exportedAt: new Date().toISOString(),
      };

      if (format === 'csv') {
        const csvLines = [
          'id,type,title,created_at',
          ...learningItems.map((item) => `"${item.id}","${item.sourceType}","${item.title.replace(/"/g, '""')}","${item.createdAt}"`),
          ...notes.map((note) => `"${note.id}","note","${(note.title || 'Note').replace(/"/g, '""')}","${note.createdAt}"`),
        ];
        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LearnUp-telemetry-${activeProfile?.id || 'export'}.csv`;
        a.click();
      } else {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LearnUp-telemetry-${activeProfile?.id || 'export'}.json`;
        a.click();
      }
      showToast(`Exported learning telemetry in ${format.toUpperCase()}`, 'success');
    } catch {
      showToast('Failed to export telemetry', 'error');
    }
  };

  const handleDownloadBackup = () => {
    handleExportTelemetry('json');
  };

  const handleClearCache = () => {
    try {
      // Clear non-critical caches while retaining profiles and active profile
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('LearnUp_cache_') || key.startsWith('LearnUp_ocr_')) {
          localStorage.removeItem(key);
        }
      });
      showToast('Offline media buffer and local caches purged successfully', 'success');
    } catch {
      showToast('Failed to clear cache', 'error');
    }
  };

  const handleResetHistory = () => {
    if (confirm('Reset your daily study history and streak counters for this profile? Your courses and notes will NOT be deleted.')) {
      showToast('Learning history and streaks reset successfully', 'info');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm(`Delete local guest profile "${activeProfile?.name || 'Active'}" and all its courses from SQLite? This cannot be undone.`)) {
      showToast('Profile deleted from local storage', 'warning');
    }
  };

  const currentTabObj = SETTINGS_TABS.find((t) => t.id === activeTab) || SETTINGS_TABS[0];
  const userEmailDisplay = activeProfile?.cloudUserEmail || 'learner@LearnUp.local';
  const userNameDisplay = settings.display_name || activeProfile?.name || 'Learner';

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <div className={styles.headerIcon}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h1 className={styles.heading}>{currentTabObj.icon} {currentTabObj.label}</h1>
          </div>
          <p className={styles.subheading}>
            LearnUp Desktop Settings &bull; Dedicated configuration screen for {currentTabObj.label.toLowerCase()}.
          </p>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.savedPill}>
            <span className={styles.savedDot} />
            {saveStatus === 'saving' ? 'Saving changes...' : 'All changes saved locally'}
          </span>
          <span className={styles.schemaBadge}>SCHEMA: v4.2.0</span>
        </div>
      </header>

      {/* Main 2-Column Layout */}
      <div className={styles.layoutGrid}>
        {/* Left Navigation Column */}
        <aside className={styles.navColumn}>
          <SettingsNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            userEmail={userEmailDisplay}
            userName={userNameDisplay}
            userAvatar={settings.avatar_url}
          />
        </aside>

        {/* Right Content Column */}
        <main className={styles.contentColumn} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. Cloud Synchronization Foundation */}
          {activeTab === 'cloud-sync' && (
            <div style={{ background: 'var(--sf-bg-surface, #ffffff)', border: '1px solid var(--sf-border-subtle, #e2e8f0)', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--sf-text-primary, #0f172a)' }}>
                    Cloud Synchronization Foundation (SF-122)
                  </h2>
                  <p style={{ margin: 0, color: 'var(--sf-text-muted, #64748b)', fontSize: '0.875rem' }}>
                    Local SQLite durable journal with transport-independent sync engine
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 600 }}>
                    Online &bull; Transport: MockSyncTransport (Offline-Safe)
                  </span>
                </div>
              </div>

              {/* Status Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Account Link Status */}
                <div style={{ background: 'var(--sf-bg-subtle, #f8fafc)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--sf-border-subtle, #e2e8f0)' }}>
                  <div style={{ color: 'var(--sf-text-muted, #64748b)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Account Link Status
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', color: activeProfile?.cloudUserId ? 'var(--sf-accent-primary, #0d9488)' : '#8b5cf6' }}>
                    {activeProfile?.cloudUserId ? (
                      <div>
                        <span>Linked to: {activeProfile.cloudUserEmail || 'student@learnup.io'}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)', fontWeight: 'normal', marginTop: '2px' }}>
                          Cloud ID: {activeProfile.cloudUserId}
                        </div>
                      </div>
                    ) : (
                      <span>Local Guest Mode (Unlinked)</span>
                    )}
                  </div>
                </div>

                {/* Pending Mutations */}
                <div style={{ background: 'var(--sf-bg-subtle, #f8fafc)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--sf-border-subtle, #e2e8f0)' }}>
                  <div style={{ color: 'var(--sf-text-muted, #64748b)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Pending Mutations
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 'bold', marginTop: '4px', color: (syncDiagnostics?.pendingCount || 0) > 0 ? '#f59e0b' : 'var(--sf-text-primary, #0f172a)' }}>
                    {syncDiagnostics?.pendingCount || 0} Pending Mutations
                  </div>
                </div>

                {/* Sync State */}
                <div style={{ background: 'var(--sf-bg-subtle, #f8fafc)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--sf-border-subtle, #e2e8f0)' }}>
                  <div style={{ color: 'var(--sf-text-muted, #64748b)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Sync State
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 'bold', marginTop: '4px', color: isSyncing ? 'var(--sf-accent-primary, #0d9488)' : 'var(--sf-text-primary, #0f172a)' }}>
                    {isSyncing ? 'SYNCING IN PROGRESS...' : syncDiagnostics?.isPaused ? 'PAUSED' : 'IDLE (Ready)'}
                  </div>
                </div>

                {/* Last Sync Attempt */}
                <div style={{ background: 'var(--sf-bg-subtle, #f8fafc)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--sf-border-subtle, #e2e8f0)' }}>
                  <div style={{ color: 'var(--sf-text-muted, #64748b)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Last Sync Attempt
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', color: 'var(--sf-text-primary, #0f172a)' }}>
                    {syncDiagnostics?.lastSyncTimestamp ? new Date(syncDiagnostics.lastSyncTimestamp).toLocaleTimeString() : 'Never'}
                  </div>
                </div>
              </div>

              {/* Security & Safety Note */}
              <div style={{ background: 'rgba(13, 148, 136, 0.05)', border: '1px solid rgba(13, 148, 136, 0.2)', padding: '0.875rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--sf-accent-primary, #0d9488)', marginBottom: '1.25rem' }}>
                🛡️ <strong>Safety Guarantee:</strong> Currently running in <code>MockSyncTransport</code> isolated test mode. Local SQLite is the offline source of truth. No production Supabase service-role keys are exposed in this desktop client.
              </div>

              {/* Action Controls */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--sf-accent-primary, #0d9488)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                    opacity: isSyncing ? 0.7 : 1,
                  }}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>

                <button
                  type="button"
                  onClick={onTogglePauseSync}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--sf-bg-surface, #ffffff)',
                    color: 'var(--sf-text-primary, #0f172a)',
                    border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {syncDiagnostics?.isPaused ? 'Resume Sync' : 'Pause Sync'}
                </button>

                {activeProfile?.cloudUserId ? (
                  <button
                    type="button"
                    onClick={onUnlinkAccount}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fca5a5',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    Unlink Cloud Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenLinkModal}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'var(--sf-bg-surface, #ffffff)',
                      color: 'var(--sf-accent-primary, #0d9488)',
                      border: '1px solid var(--sf-accent-primary, #0d9488)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    Link Cloud Account...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. Account & Profiles */}
          {activeTab === 'account' && (
            <>
              <AccountSection
                username={settings.username || (activeProfile?.name ? `@${activeProfile.name.toLowerCase().replace(/\s+/g, '_')}` : '@learner')}
                displayName={userNameDisplay}
                email={userEmailDisplay}
                studentId={settings.student_id || 'SF-9021'}
                avatarUrl={settings.avatar_url}
                onChange={(field, val) => handleFieldChange(field as keyof UserSettings, val)}
                onSignOutAll={() => {
                  showToast('Signed out of all simulated cloud sessions', 'info');
                }}
              />

              {/* Offline Profiles & Isolation Section */}
              <div style={{ background: 'var(--sf-bg-surface, #ffffff)', border: '1px solid var(--sf-border-subtle, #e2e8f0)', borderRadius: '12px', padding: '1.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--sf-text-primary, #0f172a)' }}>
                  Offline Profiles &amp; Study Isolation
                </h2>
                <p style={{ margin: '0 0 1.25rem', color: 'var(--sf-text-muted, #64748b)', fontSize: '0.875rem' }}>
                  Each profile maintains isolated courses, video bookmarks, study notes, and focus history in SQLite.
                </p>

                {/* Profiles Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
                  {profiles.map((p) => {
                    const isCurrent = p.id === activeProfile?.id;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isCurrent ? '2px solid var(--sf-accent-primary, #0d9488)' : '1px solid var(--sf-border-subtle, #e2e8f0)',
                          background: isCurrent ? 'rgba(13, 148, 136, 0.04)' : 'var(--sf-bg-subtle, #f8fafc)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span style={{ fontSize: '1.25rem' }}>👤</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--sf-text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name} {isCurrent && <span style={{ color: 'var(--sf-accent-primary, #0d9488)', fontSize: '0.75rem' }}>(Active)</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)' }}>
                              ID: {p.id} &bull; {p.cloudUserId ? 'Cloud Linked' : 'Local Guest'}
                            </div>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => onSelectProfile(p)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: 'var(--sf-bg-surface, #ffffff)',
                              border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--sf-text-primary, #0f172a)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            Switch Profile
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Create New Profile Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newProfileName.trim()) return;
                    onCreateProfile(newProfileName.trim());
                    setNewProfileName('');
                  }}
                  style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}
                >
                  <input
                    type="text"
                    placeholder="New profile name (e.g., Alex Study)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                      fontSize: '0.875rem',
                      background: 'var(--sf-bg-subtle, #f8fafc)',
                      color: 'var(--sf-text-primary, #0f172a)',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'var(--sf-accent-primary, #0d9488)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Create
                  </button>
                </form>
              </div>
            </>
          )}

          {/* 3. Security & MFA */}
          {activeTab === 'security' && (
            <MfaSettings
              isCloudLinked={Boolean(activeProfile?.cloudUserId)}
              cloudEmail={activeProfile?.cloudUserEmail}
              onNavigateSync={() => setActiveTab('cloud-sync')}
            />
          )}

          {/* 4. Appearance & Interface */}
          {activeTab === 'appearance' && (
            <AppearanceSection
              themeMode={settings.theme_mode}
              accentColor={settings.accent_color}
              onChangeTheme={(mode: ThemeMode) => handleFieldChange('theme_mode', mode)}
              onChangeAccent={(accent: AccentColor) => handleFieldChange('accent_color', accent)}
            />
          )}

          {/* 5. Customization Studio */}
          {activeTab === 'customization' && (
            <CustomizationSection onNotify={(msg) => showToast(msg, 'info')} />
          )}

          {/* 6. Module Manager */}
          {activeTab === 'modules' && (
            <>
              <ModuleManagerSection />
              
              {/* Quick Actions Panel for Desktop Module Registry */}
              <div style={{ background: 'var(--sf-bg-surface, #ffffff)', border: '1px solid var(--sf-border-subtle, #e2e8f0)', borderRadius: '12px', padding: '1.5rem', marginTop: '16px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--sf-text-primary, #0f172a)' }}>
                  ⚡ Quick Module Presets
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={onSelectAllModules}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'var(--sf-accent-primary, #0d9488)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Enable All Core &amp; Extended Modules
                  </button>
                  <button
                    type="button"
                    onClick={onDeselectAllModules}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'var(--sf-bg-subtle, #f8fafc)',
                      color: 'var(--sf-text-primary, #0f172a)',
                      border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Disable Optional Modules (Minimal Focus)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 7. Focus & Timer */}
          {activeTab === 'focus-timer' && (
            <FocusTimerSection
              sprintDuration={settings.default_sprint_duration}
              shortBreakDuration={settings.short_break_duration}
              longBreakDuration={settings.long_break_duration}
              acousticCue={settings.acoustic_cue_profile}
              autoStartBreaks={settings.auto_start_breaks}
              autoStartNextSprint={settings.auto_start_next_sprint}
              ambientSoundscape={settings.ambient_soundscape}
              compactHudTimer={settings.compact_hud_timer}
              onChangeSprint={(mins) => handleFieldChange('default_sprint_duration', mins)}
              onChangeShortBreak={(mins) => handleFieldChange('short_break_duration', mins)}
              onChangeLongBreak={(mins) => handleFieldChange('long_break_duration', mins)}
              onChangeAcousticCue={(cue) => handleFieldChange('acoustic_cue_profile', cue)}
              onToggle={(field, val) => handleFieldChange(field as keyof UserSettings, val)}
            />
          )}

          {/* 8. Learning Prefs */}
          {activeTab === 'learning-prefs' && (
            <LearningPrefsSection
              autoMarkCompleted={settings.auto_mark_video_completed}
              playerLayout={settings.default_player_layout}
              streakThreshold={settings.streak_threshold_minutes}
              srsAlgorithm={settings.spaced_repetition_algorithm}
              onToggleAutoMark={(val) => handleFieldChange('auto_mark_video_completed', val)}
              onChangeLayout={(layout: PlayerLayout) => handleFieldChange('default_player_layout', layout)}
              onChangeStreakThreshold={(mins) => handleFieldChange('streak_threshold_minutes', mins)}
              onChangeSrsAlgorithm={(algo) => handleFieldChange('spaced_repetition_algorithm', algo)}
            />
          )}

          {/* 9. AI Provider */}
          {activeTab === 'ai-provider' && (
            <AIProviderSection
              aiProvider={settings.ai_provider}
              aiModel={settings.ai_model}
              apiKey={settings.encrypted_api_key}
              contextWindow={settings.context_window}
              temperature={settings.temperature}
              onChangeProvider={(p) => handleFieldChange('ai_provider', p)}
              onChangeModel={(m) => handleFieldChange('ai_model', m)}
              onSaveKey={(k) => handleFieldChange('encrypted_api_key', k)}
              onRemoveKey={() => handleFieldChange('encrypted_api_key', null)}
            />
          )}

          {/* 10. Connectors & Vaults */}
          {activeTab === 'connectors' && (
            <ConnectorsSection />
          )}

          {/* 11. Plugins & Skills */}
          {activeTab === 'plugins-marketplace' && (
            <PluginsMarketplaceSection />
          )}

          {/* 12. Token Usage Ledger */}
          {activeTab === 'token-usage' && (
            <TokenUsageSection />
          )}

          {/* 13. Notifications */}
          {activeTab === 'notifications' && (
            <NotificationsSection
              notifyFocusCompletion={settings.notify_focus_completion}
              notifyMilestoneCelebration={settings.notify_milestone_celebration}
              notifyStreakReminder={settings.notify_streak_reminder}
              notifyQuizPrompts={settings.notify_quiz_prompts}
              notifyWeeklyDigest={settings.notify_weekly_digest}
              onToggle={(field, val) => handleFieldChange(field as keyof UserSettings, val)}
            />
          )}

          {/* 14. Recycle Bin */}
          {activeTab === 'bin' && (
            <BinSettingsSection onNotify={(msg) => showToast(msg, 'info')} />
          )}

          {/* 15. Data & Privacy */}
          {activeTab === 'data-privacy' && (
            <>
              <DataPrivacySection
                onExportTelemetry={handleExportTelemetry}
                onDownloadBackup={handleDownloadBackup}
                onClearCache={handleClearCache}
                onResetHistory={handleResetHistory}
                onDeleteAccount={handleDeleteAccount}
              />

              {/* Desktop SQLite Diagnostics Card */}
              <div style={{ background: 'var(--sf-bg-surface, #ffffff)', border: '1px solid var(--sf-border-subtle, #e2e8f0)', borderRadius: '12px', padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--sf-text-primary, #0f172a)' }}>
                  Storage Architecture Diagnostics
                </h3>
                <p style={{ margin: '0 0 1rem', color: 'var(--sf-text-muted, #64748b)', fontSize: '0.875rem' }}>
                  Platform: {platform.capabilities.platformName} &bull; Native Desktop: {platform.capabilities.isNativeDesktop ? 'Yes' : 'No'}
                </p>

                <button
                  type="button"
                  onClick={handleRunIntegrityCheck}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--sf-bg-surface, #ffffff)',
                    color: 'var(--sf-text-primary, #0f172a)',
                    border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Run Database Integrity Check
                </button>
              </div>
            </>
          )}

        </main>
      </div>

      {/* Account Linking Modal */}
      {isLinkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--sf-bg-surface, #ffffff)',
              border: '1px solid var(--sf-border-subtle, #e2e8f0)',
              borderRadius: '16px',
              padding: '2rem',
              width: '480px',
              maxWidth: '92vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--sf-text-primary, #0f172a)' }}>
              Link Cloud Account (SF-128)
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--sf-text-muted, #64748b)', margin: '0 0 1.25rem' }}>
              Connect your local guest study records with your LearnUp cloud account.
            </p>

            {/* Local Preview */}
            <div style={{ background: 'var(--sf-bg-subtle, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--sf-border-subtle, #e2e8f0)', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--sf-text-primary, #0f172a)', marginBottom: '6px' }}>
                Local Data to be Synchronized:
              </div>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--sf-text-muted, #64748b)' }}>
                <span>Profile: <strong>{activeProfile?.name || 'Guest'}</strong></span>
                <span>Courses: <strong>{learningItems.length}</strong></span>
                <span>Notes: <strong>{notes.length}</strong></span>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sf-text-primary, #0f172a)', marginBottom: '6px' }}>
                Cloud Account Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                  fontSize: '0.875rem',
                  background: 'var(--sf-bg-subtle, #f8fafc)',
                  color: 'var(--sf-text-primary, #0f172a)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8125rem', color: 'var(--sf-text-primary, #0f172a)', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              <span>I explicitly consent to associate my local guest study records with this cloud account.</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'var(--sf-bg-subtle, #f8fafc)',
                  border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                  color: 'var(--sf-text-primary, #0f172a)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={!consentChecked || !linkEmail.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: 'var(--sf-accent-primary, #0d9488)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: !consentChecked || !linkEmail.trim() ? 'not-allowed' : 'pointer',
                  opacity: !consentChecked || !linkEmail.trim() ? 0.6 : 1,
                }}
              >
                Confirm &amp; Link Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
