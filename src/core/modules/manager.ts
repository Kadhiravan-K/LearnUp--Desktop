/**
 * LearnUp Shared Core — Module Manager Service
 * Provides client-side state management, multi-profile isolation, and dependency enforcement.
 */

import { MODULE_REGISTRY, validateModuleAction } from './registry';
import { ModuleValidationResult } from './types';

export const STORAGE_BASE_ENABLED = 'learnup_enabled_modules_v2';
export const MODULE_STATE_CHANGE_EVENT = 'learnup_module_state_change';

export function getModuleStorageKey(baseKey: string, userId: string | null): string {
  const scope = userId && userId.trim() ? `user_${userId.trim()}` : 'guest';
  return `${baseKey}_${scope}`;
}

export function getDefaultEnabledIds(): string[] {
  const ids: string[] = [];
  for (const manifest of Object.values(MODULE_REGISTRY)) {
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

  private constructor(initialUserId?: string | null) {
    this.currentUserId = initialUserId ?? null;
    this.enabledModuleIds = new Set(getDefaultEnabledIds());
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

  public getStorageKey(): string {
    return getModuleStorageKey(STORAGE_BASE_ENABLED, this.currentUserId);
  }

  public isEnabled(moduleId: string): boolean {
    const manifest = MODULE_REGISTRY[moduleId];
    if (manifest?.isLocked) return true; // Core modules are always enabled
    return this.enabledModuleIds.has(moduleId);
  }

  public getEnabledModuleIds(): string[] {
    return Array.from(this.enabledModuleIds);
  }

  public enableModule(moduleId: string): ModuleValidationResult {
    const current = this.getEnabledModuleIds();
    const result = validateModuleAction('enable', moduleId, current);
    if (!result.valid) return result;

    this.enabledModuleIds.add(moduleId);
    this.saveToStorage();
    this.notifyStateChange();
    return result;
  }

  public disableModule(moduleId: string): ModuleValidationResult {
    const current = this.getEnabledModuleIds();
    const result = validateModuleAction('disable', moduleId, current);
    if (!result.valid) return result;

    this.enabledModuleIds.delete(moduleId);
    this.saveToStorage();
    this.notifyStateChange();
    return result;
  }

  public toggleModule(moduleId: string): ModuleValidationResult {
    if (this.isEnabled(moduleId)) {
      return this.disableModule(moduleId);
    } else {
      return this.enableModule(moduleId);
    }
  }

  public setAllOptionalModules(enabled: boolean): void {
    for (const manifest of Object.values(MODULE_REGISTRY)) {
      if (manifest.kind === 'core') continue;
      if (enabled) {
        this.enabledModuleIds.add(manifest.id);
      } else {
        this.enabledModuleIds.delete(manifest.id);
      }
    }
    this.saveToStorage();
    this.notifyStateChange();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const key = this.getStorageKey();
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.enabledModuleIds = new Set(parsed);
          // Always ensure core modules are present
          for (const manifest of Object.values(MODULE_REGISTRY)) {
            if (manifest.kind === 'core') {
              this.enabledModuleIds.add(manifest.id);
            }
          }
          return;
        }
      }
    } catch {
      // Fallback to defaults
    }
    this.enabledModuleIds = new Set(getDefaultEnabledIds());
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const key = this.getStorageKey();
      const ids = Array.from(this.enabledModuleIds);
      window.localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // Ignore localStorage write quota errors
    }
  }

  private notifyStateChange(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(MODULE_STATE_CHANGE_EVENT, {
        detail: {
          userId: this.currentUserId,
          enabledModules: this.getEnabledModuleIds()
        }
      })
    );
  }
}
