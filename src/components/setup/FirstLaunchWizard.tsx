'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './FirstLaunchWizard.module.css';
import { useModuleManager } from '@/lib/hooks/useModuleManager';
import { getOrCreateGuestSessionId } from '@/lib/auth/guest-session';

interface FirstLaunchWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function FirstLaunchWizard({ isOpen, onComplete }: FirstLaunchWizardProps) {
  const { coreModules, optionalModules, toggleModule } = useModuleManager();
  const [step, setStep] = useState<number>(1);
  const [sessionMode, setSessionMode] = useState<'guest' | 'auth'>('guest');
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({});
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize default selections only once when optional modules become available
    if (!isInitializedRef.current && optionalModules.length > 0) {
      const initial: Record<string, boolean> = {};
      optionalModules.forEach((m) => {
        initial[m.id] = m.isEnabled;
      });
      setSelectedModules(initial);
      isInitializedRef.current = true;
    }
  }, [optionalModules]);

  if (!isOpen) return null;

  const handleToggleModule = (id: string) => {
    setSelectedModules((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAllOptional = () => {
    const updated: Record<string, boolean> = {};
    optionalModules.forEach((m) => {
      updated[m.id] = true;
    });
    setSelectedModules(updated);
  };

  const handleDeselectAllOptional = () => {
    const updated: Record<string, boolean> = {};
    optionalModules.forEach((m) => {
      updated[m.id] = false;
    });
    setSelectedModules(updated);
  };

  const handleFinish = () => {
    // Apply selected module states to ModuleManager
    for (const [id, enabled] of Object.entries(selectedModules)) {
      toggleModule(id, enabled);
    }

    if (sessionMode === 'guest') {
      const guestId = getOrCreateGuestSessionId();
      document.cookie = 'LearnUp_guest_mode=true; path=/; max-age=31536000; SameSite=Lax';
      document.cookie = `LearnUp_guest_session_id=${guestId}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem('LearnUp_is_guest', 'true');
        localStorage.setItem('LearnUp_guest_session_id', guestId);
      } catch {
        // Safe fallback
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('learnup_first_launch_completed_v1', 'true');
      localStorage.setItem('learnup_session_mode', sessionMode);
    }

    onComplete();
  };

  const selectedCount = Object.values(selectedModules).filter(Boolean).length;
  const totalOptional = optionalModules.length;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onComplete();
      }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.brandGroup}>
            <span className={styles.brandIcon} aria-hidden="true">🚀</span>
            <div>
              <h2 id="wizard-title" className={styles.title}>Welcome to LearnUp Desktop</h2>
              <p className={styles.subtitle}>Customize your distraction-free learning experience</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={styles.stepper} aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`${styles.stepDot} ${step === s ? styles.stepDotActive : ''}`}
                  title={`Step ${s}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onComplete}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px'
              }}
              aria-label="Close setup wizard"
              title="Close setup wizard"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className={styles.content}>
          {/* STEP 1: Account or Guest Mode */}
          {step === 1 && (
            <div>
              <h3 className={styles.stepTitle}>Step 1: Choose Your Learning Mode</h3>
              <p className={styles.stepDesc}>
                Select how you would like to use LearnUp on this browser. You can always connect an account later.
              </p>

              <div
                className={`${styles.radioCard} ${sessionMode === 'guest' ? styles.radioCardSelected : ''}`}
                onClick={() => setSessionMode('guest')}
                role="button"
                tabIndex={0}
                aria-pressed={sessionMode === 'guest'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSessionMode('guest');
                  }
                }}
              >
                <div className={styles.radioIndicator}>
                  <div className={sessionMode === 'guest' ? styles.radioDotActive : styles.radioDotInactive} />
                </div>
                <span className={styles.modeIcon}>👤</span>
                <div className={styles.optionText}>
                  <h4>Continue as Guest (Browser Storage)</h4>
                  <p>
                    Start learning immediately with zero sign-up required. Your courses, playlists, and study notes are saved locally in your browser.
                  </p>
                </div>
              </div>

              <div
                className={`${styles.radioCard} ${sessionMode === 'auth' ? styles.radioCardSelected : ''}`}
                onClick={() => setSessionMode('auth')}
                role="button"
                tabIndex={0}
                aria-pressed={sessionMode === 'auth'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSessionMode('auth');
                  }
                }}
              >
                <div className={styles.radioIndicator}>
                  <div className={sessionMode === 'auth' ? styles.radioDotActive : styles.radioDotInactive} />
                </div>
                <span className={styles.modeIcon}>☁️</span>
                <div className={styles.optionText}>
                  <h4>Cloud Synchronized Account (Supabase)</h4>
                  <p>
                    Sign in or register to synchronize your study materials, lecture progress, and roadmaps securely across all your browsers and devices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Modules */}
          {step === 2 && (
            <div>
              <div className={styles.stepHeaderRow}>
                <div>
                  <h3 className={styles.stepTitle}>Step 2: Core Systems &amp; Capability Selection</h3>
                  <p className={styles.stepDesc}>
                    Mandatory core systems are permanently locked. Select which optional modules to activate.
                  </p>
                </div>
                <div className={styles.moduleControlBar}>
                  <span className={styles.moduleCounterBadge}>
                    {selectedCount} of {totalOptional} Optional Active
                  </span>
                  <div className={styles.moduleButtonsRow}>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      onClick={handleSelectAllOptional}
                      aria-label="Select all optional modules"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      onClick={handleDeselectAllOptional}
                      aria-label="Deselect all optional modules"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.moduleList}>
                {/* Core Systems */}
                <div className={`${styles.moduleRow} ${styles.moduleRowCore}`}>
                  <div className={styles.moduleInfo}>
                    <span aria-hidden="true">🔒</span>
                    <div>
                      <span className={styles.moduleName}>Mandatory Core Foundation ({coreModules.length} Systems)</span>
                      <div className={styles.moduleMeta}>Dashboard, Library, Video Player, Notes, Settings, Module Manager</div>
                    </div>
                  </div>
                  <span className={styles.badge}>Permanently Active</span>
                </div>

                {/* Optional Capabilities */}
                {optionalModules.map((m) => {
                  const isChecked = !!selectedModules[m.id];
                  const inputId = `module-check-${m.id}`;
                  return (
                    <div
                      key={m.id}
                      className={`${styles.moduleRow} ${isChecked ? styles.moduleRowSelected : ''}`}
                      onClick={() => handleToggleModule(m.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Toggle module ${m.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleModule(m.id);
                        }
                      }}
                    >
                      <div className={styles.moduleInfo}>
                        <span aria-hidden="true">{m.icon}</span>
                        <div>
                          <label htmlFor={inputId} className={styles.moduleName} onClick={(e) => e.stopPropagation()}>
                            {m.name}
                          </label>
                          <div className={styles.moduleMeta}>{m.description}</div>
                        </div>
                      </div>
                      <div className={styles.checkboxWrapper} onClick={(e) => e.stopPropagation()}>
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModule(m.id)}
                          aria-label={m.name}
                          className={styles.checkboxInput}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Summary & Confirmation */}
          {step === 3 && (
            <div>
              <h3 className={styles.stepTitle}>Step 3: Setup Summary &amp; Confirmation</h3>
              <p className={styles.stepDesc}>
                Review your configuration below before launching your learning workspace.
              </p>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Learning Mode</div>
                  <div className={styles.summaryValue}>
                    {sessionMode === 'guest' ? '👤 Guest Workspace' : '☁️ Cloud Account'}
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Storage Engine</div>
                  <div className={styles.summaryValue}>
                    {sessionMode === 'guest' ? 'Browser LocalStorage' : 'Supabase PostgreSQL'}
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Optional Modules</div>
                  <div className={styles.summaryValue}>
                    {selectedCount} of {totalOptional} modules enabled
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Cloud Synchronization</div>
                  <div className={styles.summaryValue}>
                    {sessionMode === 'guest' ? 'Local Only (Sign in to sync)' : 'Enabled across devices'}
                  </div>
                </div>
              </div>

              {/* Data Protection Information */}
              <details className={styles.detailsSection} open>
                <summary className={styles.detailsSummary}>
                  <span>🛡️ Browser Storage &amp; Persistence Information</span>
                  <span className={styles.detailsChevron}>▾</span>
                </summary>
                <div className={styles.detailsBody}>
                  <p>
                    In Guest Mode, your learning library, lecture progress, and study notes are preserved directly in your browser. Clearing your browser cookies and site storage will reset guest data.
                  </p>
                  <p>
                    To access your courses across devices and protect your progress permanently, you can sign in or create a free cloud account at any time from Settings.
                  </p>
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className={styles.footer}>
          {step > 1 ? (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className={styles.buttonGroup}>
            {step < 3 ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue &rarr;
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnFinish}
                onClick={handleFinish}
              >
                Finish Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
