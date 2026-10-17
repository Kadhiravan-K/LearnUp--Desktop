'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useModuleManager } from '@/lib/hooks/useModuleManager';
import { MODULE_REGISTRY } from '@/lib/modules/registry';
import { ModuleManifest } from '@/lib/modules/types';
import styles from './ModuleGate.module.css';

export interface ModuleGateProps {
  moduleId: string;
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export interface ModuleGateState {
  shouldRenderChildren: boolean;
  title: string;
  description: string;
  manifest: ModuleManifest | null;
}

export function getModuleGateState(
  moduleId: string,
  isEnabled: boolean,
  fallbackTitle?: string,
  fallbackDescription?: string
): ModuleGateState {
  const manifest = MODULE_REGISTRY[moduleId] || null;
  if (isEnabled) {
    return {
      shouldRenderChildren: true,
      title: '',
      description: '',
      manifest
    };
  }

  const title = fallbackTitle || (manifest ? `${manifest.name} is Disabled` : 'Module Disabled');
  const description =
    fallbackDescription ||
    (manifest
      ? `The "${manifest.name}" capability is currently turned off in your Module Manager settings. Your underlying learning items, study notes, and records remain completely safe in storage.`
      : 'This capability is currently disabled in your personal preferences.');

  return {
    shouldRenderChildren: false,
    title,
    description,
    manifest
  };
}

export function ModuleGate({
  moduleId,
  children,
  fallbackTitle,
  fallbackDescription
}: ModuleGateProps) {
  const { isModuleEnabled, toggleModule } = useModuleManager();
  const [enableError, setEnableError] = useState<string | null>(null);

  const enabled = isModuleEnabled(moduleId);
  const gateState = getModuleGateState(moduleId, enabled, fallbackTitle, fallbackDescription);

  if (gateState.shouldRenderChildren) {
    return <>{children}</>;
  }

  const handleEnable = () => {
    setEnableError(null);
    const result = toggleModule(moduleId, true);
    if (!result.valid) {
      setEnableError(result.errors.join(' '));
    }
  };

  return (
    <div className={styles.gateContainer}>
      <div className={styles.gateCard} role="status" aria-live="polite">
        <div className={styles.iconWrapper} aria-hidden="true">
          {gateState.manifest?.icon || '📦'}
        </div>

        <span className={styles.badge}>
          <span>⚪</span> Module Inactive
        </span>

        <h2 className={styles.title}>{gateState.title}</h2>
        <p className={styles.description}>{gateState.description}</p>

        <div className={styles.dataNotice}>
          🔒 <strong>Data Retention Guarantee:</strong> Disabling this feature does not delete your notes, history, or saved progress.
        </div>

        {enableError && (
          <div style={{ color: 'var(--sf-color-error, #dc2626)', fontSize: '0.8125rem', marginTop: '4px' }}>
            ⚠️ {enableError}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.enableButton} onClick={handleEnable}>
            ⚡ Enable Module Now
          </button>

          <div className={styles.secondaryRow}>
            <Link href="/dashboard" className={styles.secondaryButton}>
              ← Dashboard
            </Link>
            <Link href="/settings?tab=modules" className={styles.secondaryButton}>
              ⚙️ Module Manager
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
