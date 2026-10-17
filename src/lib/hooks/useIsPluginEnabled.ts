'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Checks if a plugin is currently installed and enabled in localStorage.
 */
export function getPluginStatus(pluginId: string, defaultEnabled = true): boolean {
  if (typeof window === 'undefined') return defaultEnabled;
  try {
    const uninstalledRaw = localStorage.getItem('LearnUp_uninstalled_plugins');
    const uninstalledSet = new Set(uninstalledRaw ? JSON.parse(uninstalledRaw) : []);
    if (uninstalledSet.has(pluginId)) {
      return false;
    }

    const pluginStateRaw = localStorage.getItem(`LearnUp_plugin_${pluginId}_enabled`);
    if (pluginStateRaw !== null) {
      return pluginStateRaw === 'true';
    }

    return defaultEnabled;
  } catch {
    return defaultEnabled;
  }
}

/**
 * Sets a plugin's enabled status and dispatches an event to notify all components.
 */
export function setPluginStatus(pluginId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`LearnUp_plugin_${pluginId}_enabled`, String(enabled));
    
    // If enabling, also ensure it is removed from uninstalled set
    if (enabled) {
      const uninstalledRaw = localStorage.getItem('LearnUp_uninstalled_plugins');
      const uninstalledSet = new Set(uninstalledRaw ? JSON.parse(uninstalledRaw) : []);
      if (uninstalledSet.has(pluginId)) {
        uninstalledSet.delete(pluginId);
        localStorage.setItem('LearnUp_uninstalled_plugins', JSON.stringify(Array.from(uninstalledSet)));
      }
    }

    window.dispatchEvent(new CustomEvent('LearnUp_plugins_updated', { detail: { pluginId, enabled } }));
  } catch {}
}

/**
 * React hook to reactively track whether a plugin is enabled.
 */
export function useIsPluginEnabled(pluginId: string, defaultEnabled = true): boolean {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => getPluginStatus(pluginId, defaultEnabled));

  const checkStatus = useCallback(() => {
    setIsEnabled(getPluginStatus(pluginId, defaultEnabled));
  }, [pluginId, defaultEnabled]);

  useEffect(() => {
    checkStatus();

    const handleUpdate = () => checkStatus();
    window.addEventListener('LearnUp_plugins_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('LearnUp_plugins_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [checkStatus]);

  return isEnabled;
}
