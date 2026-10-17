'use client';

import React, { useState } from 'react';
import { useModuleManager } from '@/lib/hooks/useModuleManager';
import { Alert } from '@/components/ui/Alert/Alert';
import { Button } from '@/components/ui/Button/Button';
import styles from './ModuleManagerSection.module.css';

export function ModuleManagerSection() {
  const {
    allModules,
    coreModules,
    optionalModules,
    currentUserId,
    toggleModule,
    resetToDefaults
  } = useModuleManager();

  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const activeCount = allModules.filter((m) => m.isEnabled).length;
  const activeOptionalCount = optionalModules.filter((m) => m.isEnabled).length;

  const totalDesktopSize = allModules
    .filter((m) => m.isEnabled)
    .reduce((sum, m) => sum + (m.desktopInstallerSizeEstimateMb || 0), 0);

  const handleToggle = (moduleId: string, currentEnabled: boolean) => {
    setErrorNotice(null);
    setSuccessNotice(null);

    const result = toggleModule(moduleId, !currentEnabled);
    if (!result.valid) {
      setErrorNotice(result.errors.join(' '));
    } else {
      const action = !currentEnabled ? 'enabled' : 'disabled';
      const manifest = allModules.find((m) => m.id === moduleId);
      setSuccessNotice(`Capability "${manifest?.name || moduleId}" was successfully ${action}. All user data remains securely preserved.`);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all optional capabilities to recommended default states? (No user content or database records will be modified)')) {
      resetToDefaults();
      setSuccessNotice('Modules reset to recommended default states.');
      setErrorNotice(null);
    }
  };

  return (
    <div className={styles.container}>
      {errorNotice && <Alert variant="error">{errorNotice}</Alert>}
      {successNotice && <Alert variant="success">{successNotice}</Alert>}

      {/* Header Summary Box */}
      <div className={styles.headerSummary}>
        <h3 className={styles.summaryTitle}>
          <span>🎛️</span>
          <span>Modular Learning Architecture &amp; Capability Manager</span>
        </h3>
        <p className={styles.summarySubtitle}>
          Tailor your LearnUp installation for maximum focus and minimal footprint.
          Core systems are mandatory and permanently locked. Optional feature packs can be freely enabled or disabled
          without deleting your notes, courses, or progress records.
        </p>

        <div className={styles.statsBar}>
          <span className={`${styles.statTag} ${styles.statTagActive}`}>
            Active Capabilities: <strong>{activeCount} of {allModules.length}</strong>
          </span>
          <span className={styles.statTag}>
            Core Systems: <strong>{coreModules.length} (Locked)</strong>
          </span>
          <span className={styles.statTag}>
            Active Optional: <strong>{activeOptionalCount} of {optionalModules.length}</strong>
          </span>
          <span className={styles.statTag}>
            Estimated Desktop Package: <strong>~{totalDesktopSize.toFixed(1)} MB</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--sf-color-text-secondary, #64748b)', marginTop: '12px' }}>
          <span>👤 Profile Scope:</span>
          <strong>{currentUserId ? `Account (${currentUserId.slice(0, 8)}...)` : 'Guest Mode (Local Preferences)'}</strong>
          <span>•</span>
          <span>🔄 Cross-Tab Synchronized</span>
          <span>•</span>
          <span>🔒 Account-Isolated Storage</span>
        </div>
      </div>

      {/* 1. Core Mandatory Modules */}
      <div>
        <div className={styles.sectionTitleGroup}>
          <div>
            <h4 className={styles.sectionHeading}>
              <span>🔒</span>
              <span>Mandatory Core Systems (Locked)</span>
            </h4>
            <p className={styles.sectionDescription}>
              Essential learning foundation required for basic offline and online operation. Cannot be disabled.
            </p>
          </div>
        </div>

        <div className={styles.moduleGrid} style={{ marginTop: '0.875rem' }}>
          {coreModules.map((module) => (
            <div key={module.id} className={`${styles.moduleCard} ${styles.moduleCardCore}`}>
              <div>
                <div className={styles.cardHeader}>
                  <div className={styles.iconTitleGroup}>
                    <span className={styles.moduleIcon} aria-hidden="true">{module.icon}</span>
                    <div className={styles.moduleTitleBlock}>
                      <h5 className={styles.moduleName}>{module.name}</h5>
                      <span className={styles.moduleVersion}>v{module.version}</span>
                    </div>
                  </div>
                  <span className={styles.lockedTag} title="Core systems are permanently locked and active">
                    🔒 Core System
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.moduleDesc}>{module.description}</p>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.tagRow}>
                  <span className={styles.pillBadge}>
                    Storage: {module.storageType.replace('_', ' ')}
                  </span>
                  {module.offlineCapable && (
                    <span className={`${styles.pillBadge} ${styles.pillBadgeOffline}`}>
                      ✓ Offline Capable
                    </span>
                  )}
                  {module.route && (
                    <span className={styles.pillBadge} style={{ fontFamily: 'monospace' }}>
                      {module.route}
                    </span>
                  )}
                </div>
                <div className={styles.dataRetentionText}>
                  <span>🛡️</span>
                  <span>{module.dataRetentionPolicy}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Optional Capabilities */}
      <div style={{ marginTop: '0.5rem' }}>
        <div className={styles.sectionTitleGroup}>
          <div>
            <h4 className={styles.sectionHeading}>
              <span>🧩</span>
              <span>Optional Capabilities &amp; Feature Packs</span>
            </h4>
            <p className={styles.sectionDescription}>
              Toggle modular features to reduce memory usage and interface distraction. Disabling a module hides its navigation entry points while preserving all underlying data.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>

        <div className={styles.moduleGrid} style={{ marginTop: '0.875rem' }}>
          {optionalModules.map((module) => {
            const isEnabled = module.isEnabled;

            return (
              <div
                key={module.id}
                className={`${styles.moduleCard} ${
                  isEnabled ? styles.moduleCardActive : styles.moduleCardDisabled
                }`}
              >
                <div>
                  <div className={styles.cardHeader}>
                    <div className={styles.iconTitleGroup}>
                      <span className={styles.moduleIcon} aria-hidden="true">{module.icon}</span>
                      <div className={styles.moduleTitleBlock}>
                        <h5 className={styles.moduleName}>{module.name}</h5>
                        <span className={styles.moduleVersion}>v{module.version}</span>
                      </div>
                    </div>

                    <label className={styles.toggleSwitch} aria-label={`Toggle ${module.name}`}>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggle(module.id, isEnabled)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  <div className={styles.cardBody}>
                    <p className={styles.moduleDesc}>{module.description}</p>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.tagRow}>
                    <span className={styles.pillBadge}>
                      {module.category.replace('_', ' ')}
                    </span>
                    {module.dependencies.length > 0 && (
                      <span className={`${styles.pillBadge} ${styles.pillBadgeDep}`}>
                        Requires: {module.dependencies.map((d) => d.replace('mod-', '').replace('core-', '')).join(', ')}
                      </span>
                    )}
                    {module.offlineCapable ? (
                      <span className={`${styles.pillBadge} ${styles.pillBadgeOffline}`}>
                        ✓ Offline
                      </span>
                    ) : (
                      <span className={styles.pillBadge} style={{ color: '#64748b' }}>
                        🌐 Online only
                      </span>
                    )}
                    {module.desktopInstallerSizeEstimateMb && (
                      <span className={styles.pillBadge}>
                        ~{module.desktopInstallerSizeEstimateMb} MB
                      </span>
                    )}
                  </div>
                  <div className={styles.dataRetentionText}>
                    <span>🛡️</span>
                    <span>{module.dataRetentionPolicy}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
