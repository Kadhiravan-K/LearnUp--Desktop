'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ModuleManager, MODULE_STATE_CHANGE_EVENT } from '@/lib/modules/manager';
import { useAuth } from './useAuth';
import {
  MODULE_REGISTRY,
  getAllModuleManifests,
  getCoreModuleManifests,
  getOptionalModuleManifests
} from '@/lib/modules/registry';
import { ModuleManifest, ModuleValidationResult } from '@/lib/modules/types';

export interface ModuleItemWithState extends ModuleManifest {
  isEnabled: boolean;
  isInstalled: boolean;
}

export function useModuleManager(explicitUserId?: string | null) {
  const { user } = useAuth();
  const effectiveUserId = explicitUserId !== undefined ? explicitUserId : (user?.id ?? null);

  const [manager] = useState(() => ModuleManager.getInstance(effectiveUserId));
  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => manager.getEnabledIds());
  const [installedIds, setInstalledIds] = useState<Set<string>>(() => manager.getInstalledIds());

  const syncState = useCallback(() => {
    setEnabledIds(manager.getEnabledIds());
    setInstalledIds(manager.getInstalledIds());
  }, [manager]);

  // Keep user scope synchronized when auth user changes
  useEffect(() => {
    manager.setUserScope(effectiveUserId);
    syncState();
  }, [manager, effectiveUserId, syncState]);

  useEffect(() => {
    // Initial sync
    syncState();

    const handleStateChange = () => {
      syncState();
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (manager.isStorageKeyRelevant(e.key)) {
        manager.reloadFromStorage();
        syncState();
      }
    };

    window.addEventListener(MODULE_STATE_CHANGE_EVENT, handleStateChange);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(MODULE_STATE_CHANGE_EVENT, handleStateChange);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [manager, syncState]);

  const isModuleEnabled = useCallback(
    (moduleId: string) => {
      const manifest = MODULE_REGISTRY[moduleId];
      if (manifest?.isLocked) return true;
      return enabledIds.has(moduleId);
    },
    [enabledIds]
  );

  const isModuleInstalled = useCallback(
    (moduleId: string) => {
      const manifest = MODULE_REGISTRY[moduleId];
      if (manifest?.isLocked) return true;
      return installedIds.has(moduleId);
    },
    [installedIds]
  );

  const toggleModule = useCallback(
    (moduleId: string, enable: boolean): ModuleValidationResult => {
      const result = manager.setModuleEnabled(moduleId, enable);
      syncState();
      return result;
    },
    [manager, syncState]
  );

  const installModule = useCallback(
    (moduleId: string): ModuleValidationResult => {
      const result = manager.installModule(moduleId);
      syncState();
      return result;
    },
    [manager, syncState]
  );

  const uninstallModule = useCallback(
    (moduleId: string): ModuleValidationResult => {
      const result = manager.uninstallModule(moduleId);
      syncState();
      return result;
    },
    [manager, syncState]
  );

  const resetToDefaults = useCallback(() => {
    manager.resetToDefaults();
    syncState();
  }, [manager, syncState]);

  const decorateManifest = useCallback(
    (manifest: ModuleManifest): ModuleItemWithState => ({
      ...manifest,
      isEnabled: isModuleEnabled(manifest.id),
      isInstalled: isModuleInstalled(manifest.id)
    }),
    [isModuleEnabled, isModuleInstalled]
  );

  const allModules = useMemo(
    () => getAllModuleManifests().map(decorateManifest),
    [decorateManifest]
  );
  const coreModules = useMemo(
    () => getCoreModuleManifests().map(decorateManifest),
    [decorateManifest]
  );
  const optionalModules = useMemo(
    () => getOptionalModuleManifests().map(decorateManifest),
    [decorateManifest]
  );

  return {
    manager,
    currentUserId: effectiveUserId,
    allModules,
    coreModules,
    optionalModules,
    isModuleEnabled,
    isModuleInstalled,
    toggleModule,
    installModule,
    uninstallModule,
    resetToDefaults
  };
}
