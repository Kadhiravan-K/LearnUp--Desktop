import React from 'react';
import styles from './SettingsNav.module.css';

export interface SettingsNavProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  userEmail?: string;
  userName?: string;
  userAvatar?: string | null;
  onSignOut?: () => void;
}

export const SETTINGS_TABS = [
  { id: 'cloud-sync', label: 'Cloud Synchronization', icon: '☁️', badge: 'SF-122' },
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'security', label: 'Security & MFA', icon: '🔒' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'customization', label: 'Customization Studio', icon: '🎛️', badge: 'NEW' },
  { id: 'modules', label: 'Module Manager', icon: '📦', badge: 'v3.0' },
  { id: 'focus-timer', label: 'Focus & Timer', icon: '⏱' },
  { id: 'learning-prefs', label: 'Learning Prefs', icon: '📖' },
  { id: 'ai-provider', label: 'AI Provider', icon: '🤖', badge: 'ENCRYPTED' },
  { id: 'connectors', label: 'Connectors & Vaults', icon: '🔌' },
  { id: 'plugins-marketplace', label: 'Plugins & Skills', icon: '🧩' },
  { id: 'token-usage', label: 'Token Ledger & MCP', icon: '📊' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'bin', label: 'Recycle Bin & Retention', icon: '🗑️', badge: '10d' },
  { id: 'data-privacy', label: 'Data & Privacy', icon: '🛡', alert: true }
];

export function SettingsNav({
  activeTab,
  onSelectTab,
  userEmail = '',
  userName = 'Learner',
  userAvatar,
  onSignOut
}: SettingsNavProps) {
  const initial = userName ? userName.charAt(0).toUpperCase() : 'L';

  return (
    <nav className={styles.navContainer} aria-label="Settings navigation">
      <span className={styles.navTitle}>NAVIGATION</span>
      <ul className={styles.tabList}>
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id}>
              <button
                type="button"
                className={`${styles.tabButton} ${isActive ? styles.tabActive : ''}`}
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'true' : undefined}
              >
                <div className={styles.tabLeft}>
                  <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
                  <span className={styles.tabLabel}>{tab.label}</span>
                </div>
                {tab.badge && <span className={styles.tabBadge}>{tab.badge}</span>}
                {tab.alert && <span className={styles.tabAlertDot} aria-label="Alert available" />}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Profile Mini Card */}
      <div className={styles.userCard}>
        <div className={styles.userAvatar}>
          {userAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={userAvatar} alt={userName} className={styles.avatarImg} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userStatusRow}>
            <span className={styles.statusDot} />
            <span className={styles.userName}>{userName}</span>
          </div>
          <span className={styles.userEmail}>{userEmail}</span>
        </div>
        <button
          type="button"
          className={styles.switchBtn}
          aria-label="Switch account"
          title="Switch account"
          onClick={() => {
            if (onSignOut) onSignOut();
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
      </div>

      {/* Client Storage Meter */}
      <div className={styles.storageMeter}>
        <div className={styles.storageHeader}>
          <div className={styles.storageDotLabel}>
            <span className={styles.storageDot} />
            <span className={styles.storageTitle}>CLIENT STORAGE</span>
          </div>
          <span className={styles.storageRatio}>3.8 MB / 50 MB</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '8%' }} />
        </div>
        <p className={styles.storageDesc}>
          IndexedDB mirrors synced with Zero-Knowledge Local AES-GCM vault.
        </p>
      </div>
    </nav>
  );
}
