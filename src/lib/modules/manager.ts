/**
 * LearnUp 3.0 — Module Manager Runtime Service
 * 
 * Manages enabled/disabled states and install states safely in client-side storage,
 * dispatches sync events across window contexts, guarantees Core system invariants,
 * and isolates module state between user accounts on the same browser.
 */

import { MODULE_REGISTRY, validateModuleAction } from './registry';
import { ModuleValidationResult } from './types';

export const STORAGE_BASE_ENABLED = 'learnup_enabled_modules_v2';
export const STORAGE_BASE_INSTALLED = 'learnup_installed_modules_v2';
export const LEGACY_STORAGE_KEY_ENABLED = 'learnup_enabled_modules_v1';
export const LEGACY_STORAGE_KEY_INSTALLED = 'learnup_installed_modules_v1';
export const MODULE_STATE_CHANGE_EVENT = 'learnup_module_state_change';

export function getModuleStorageKey(baseKey: string, userId: string | null): string {
  const scope = userId && userId.trim() ? `user_${userId.trim()}` : 'guest';
  return `${baseKey}_${scope}`;
}

export function getInitialDefaultEnabledIds(): string[] {
  const ids: string[] = [];
  for (const manifest of Object.values(MODULE_REGISTRY)) {
    if (manifest.kind === 'core' || manifest.defaultEnabled) {
      ids.push(manifest.id);
    }
  }
  return ids;
}

export function getInitialDefaultInstalledIds(): string[] {
  const ids: string[] = [];
  for (const manifest of Object.values(MODULE_REGISTRY)) {
    // Core modules and default web modules are pre-installed
    if (manifest.kind === 'core' || manifest.defaultEnabled) {
      ids.push(manifest.id);
    }
  }
  return ids;
}

export class ModuleManager {
  private static instance: ModuleManager | null = null;
  private currentUserId: string | null = null;
  private enabledModuleIds: Set<string>;
  private installedModuleIds: Set<string>;

  private constructor(initialUserId?: string | null) {
    this.currentUserId = initialUserId ?? null;
    this.enabledModuleIds = new Set(getInitialDefaultEnabledIds());
    this.installedModuleIds = new Set(getInitialDefaultInstalledIds());
    this.loadFromStorage();
  }

  public static getInstance(initialUserId?: string | null): ModuleManager {
    if (!ModuleManager.instance) {
      ModuleManager.instance = new ModuleManager(initialUserId);
    } else if (initialUserId !== undefined && ModuleManager.instance.currentUserId !== initialUserId) {
      ModuleManager.instance.setUserScope(initialUserId);
    }
    return ModuleManager.instance;
  }

  /**
   * Switches the active user scope for multi-user isolation on the same browser.
   */
  public setUserScope(userId: string | null): void {
    const normalized = userId && userId.trim() ? userId.trim() : null;
    if (this.currentUserId === normalized) return;

    this.currentUserId = normalized;
    this.loadFromStorage();
    this.notifyStateChange();
  }

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  public getEnabledStorageKey(): string {
    return getModuleStorageKey(STORAGE_BASE_ENABLED, this.currentUserId);
  }

  public getInstalledStorageKey(): string {
    return getModuleStorageKey(STORAGE_BASE_INSTALLED, this.currentUserId);
  }

  public isStorageKeyRelevant(key: string | null): boolean {
    if (!key) return false;
    return (
      key === this.getEnabledStorageKey() ||
      key === this.getInstalledStorageKey() ||
      key === LEGACY_STORAGE_KEY_ENABLED ||
      key === LEGACY_STORAGE_KEY_INSTALLED
    );
  }

  /**
   * Reloads state from storage. Safe to call on window 'storage' events for cross-tab sync.
   */
  public reloadFromStorage(): void {
    this.loadFromStorage();
    this.notifyStateChange();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    const enabledKey = this.getEnabledStorageKey();
    const installedKey = this.getInstalledStorageKey();

    let loadedEnabled: string[] | null = null;
    let loadedInstalled: string[] | null = null;

    try {
      // 1. Try reading user-scoped keys
      const storedEnabled = localStorage.getItem(enabledKey);
      if (storedEnabled) {
        const parsed = JSON.parse(storedEnabled);
        if (Array.isArray(parsed)) {
          loadedEnabled = parsed;
        }
      } else if (!this.currentUserId) {
        // Fall back to legacy global key for guests / migration
        const legacyEnabled = localStorage.getItem(LEGACY_STORAGE_KEY_ENABLED);
        if (legacyEnabled) {
          const parsed = JSON.parse(legacyEnabled);
          if (Array.isArray(parsed)) loadedEnabled = parsed;
        }
      }

      const storedInstalled = localStorage.getItem(installedKey);
      if (storedInstalled) {
        const parsed = JSON.parse(storedInstalled);
        if (Array.isArray(parsed)) {
          loadedInstalled = parsed;
        }
      } else if (!this.currentUserId) {
        const legacyInstalled = localStorage.getItem(LEGACY_STORAGE_KEY_INSTALLED);
        if (legacyInstalled) {
          const parsed = JSON.parse(legacyInstalled);
          if (Array.isArray(parsed)) loadedInstalled = parsed;
        }
      }
    } catch {
      // Safe fallback on parse error / corrupted JSON
    }

    // Initialize with defaults if empty or not found
    const newEnabled = new Set<string>(loadedEnabled ?? getInitialDefaultEnabledIds());
    const newInstalled = new Set<string>(loadedInstalled ?? getInitialDefaultInstalledIds());

    // Filter out unknown / deprecated module IDs to protect from stale registry data
    for (const id of Array.from(newEnabled)) {
      if (!MODULE_REGISTRY[id]) {
        newEnabled.delete(id);
      }
    }
    for (const id of Array.from(newInstalled)) {
      if (!MODULE_REGISTRY[id]) {
        newInstalled.delete(id);
      }
    }

    // INVARIANT ENFORCEMENT: Core modules MUST always be installed and enabled
    for (const manifest of Object.values(MODULE_REGISTRY)) {
      if (manifest.kind === 'core') {
        newEnabled.add(manifest.id);
        newInstalled.add(manifest.id);
      }
    }

    // Dependency healing: Ensure no enabled module is missing a required dependency
    for (const id of Array.from(newEnabled)) {
      const manifest = MODULE_REGISTRY[id];
      if (manifest && manifest.dependencies) {
        for (const depId of manifest.dependencies) {
          if (!newEnabled.has(depId)) {
            // If dependency is missing and module is optional, disable it to preserve invariant
            if (!manifest.isLocked) {
              newEnabled.delete(id);
            }
          }
        }
      }
    }

    this.enabledModuleIds = newEnabled;
    this.installedModuleIds = newInstalled;
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const enabledKey = this.getEnabledStorageKey();
      const installedKey = this.getInstalledStorageKey();

      localStorage.setItem(enabledKey, JSON.stringify(Array.from(this.enabledModuleIds)));
      localStorage.setItem(installedKey, JSON.stringify(Array.from(this.installedModuleIds)));
      this.notifyStateChange();
    } catch {
      // Storage unavailable / quota exceeded
    }
  }

  private notifyStateChange(): void {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent(MODULE_STATE_CHANGE_EVENT, {
        detail: {
          userId: this.currentUserId,
          enabledIds: Array.from(this.enabledModuleIds),
          installedIds: Array.from(this.installedModuleIds)
        }
      }));
    } catch {
      // Safe fallback
    }
  }

  public getEnabledIds(): Set<string> {
    return new Set(this.enabledModuleIds);
  }

  public getInstalledIds(): Set<string> {
    return new Set(this.installedModuleIds);
  }

  public isEnabled(moduleId: string): boolean {
    const manifest = MODULE_REGISTRY[moduleId];
    if (manifest?.isLocked) return true; // Core modules are always enabled
    return this.enabledModuleIds.has(moduleId);
  }

  public isInstalled(moduleId: string): boolean {
    const manifest = MODULE_REGISTRY[moduleId];
    if (manifest?.isLocked) return true; // Core modules are always installed
    return this.installedModuleIds.has(moduleId);
  }

  public setModuleEnabled(moduleId: string, enable: boolean): ModuleValidationResult {
    const validation = validateModuleAction(moduleId, enable, this.enabledModuleIds);
    if (!validation.valid) {
      return validation;
    }

    if (enable) {
      this.installedModuleIds.add(moduleId); // Automatically ensure installed if enabling
      this.enabledModuleIds.add(moduleId);
    } else {
      this.enabledModuleIds.delete(moduleId);
    }

    // Re-verify core invariant
    for (const manifest of Object.values(MODULE_REGISTRY)) {
      if (manifest.kind === 'core') {
        this.enabledModuleIds.add(manifest.id);
      }
    }

    this.saveToStorage();
    return { valid: true, errors: [], warnings: [] };
  }

  public installModule(moduleId: string): ModuleValidationResult {
    const manifest = MODULE_REGISTRY[moduleId];
    if (!manifest) {
      return { valid: false, errors: [`Module "${moduleId}" not found in registry`], warnings: [] };
    }

    this.installedModuleIds.add(moduleId);
    this.saveToStorage();
    return { valid: true, errors: [], warnings: [] };
  }

  public uninstallModule(moduleId: string): ModuleValidationResult {
    const manifest = MODULE_REGISTRY[moduleId];
    if (!manifest) {
      return { valid: false, errors: [`Module "${moduleId}" not found in registry`], warnings: [] };
    }
    if (manifest.isLocked) {
      return { valid: false, errors: [`Cannot uninstall Core system module "${manifest.name}"`], warnings: [] };
    }

    // Disable first, checking dependents
    const disableResult = this.setModuleEnabled(moduleId, false);
    if (!disableResult.valid) {
      return disableResult;
    }

    this.installedModuleIds.delete(moduleId);
    this.saveToStorage();
    return { valid: true, errors: [], warnings: [] };
  }

  public resetToDefaults(): void {
    this.enabledModuleIds = new Set(getInitialDefaultEnabledIds());
    this.installedModuleIds = new Set(getInitialDefaultInstalledIds());
    this.saveToStorage();
  }
}
