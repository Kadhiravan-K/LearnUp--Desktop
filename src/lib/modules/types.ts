/**
 * LearnUp 3.0 — Modular Architecture Core Types
 * 
 * Defines the contract for core vs. optional capabilities, dependency graphs,
 * installation state, runtime activation, permissions, and data retention policies.
 */

export type ModuleKind = 'core' | 'optional';

export type ModuleCategory =
  | 'core_system'
  | 'learning'
  | 'ai_intelligence'
  | 'productivity'
  | 'career'
  | 'ecosystem';

export type StorageRequirementType =
  | 'database_relational'  // Supabase PostgreSQL tables
  | 'browser_storage'      // localStorage / IndexedDB
  | 'hybrid'               // Cloud sync + local cache
  | 'stateless';           // No persistent user data

export type PermissionScope =
  | 'network_external'     // Calls external APIs (YouTube, LLM, etc.)
  | 'storage_user_data'    // Stores durable learner data
  | 'filesystem_local'     // Desktop filesystem access (Tauri/native)
  | 'clipboard_read_write' // Clipboard access
  | 'notifications_system';// System notifications

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  kind: ModuleKind;
  category: ModuleCategory;
  description: string;
  icon: string;
  route?: string;
  isLocked: boolean; // Core modules are locked (cannot be disabled or uninstalled)
  defaultEnabled: boolean;
  dependencies: string[]; // Module IDs that must be active for this module to function
  permissions: PermissionScope[];
  storageType: StorageRequirementType;
  storageDescription: string;
  dataRetentionPolicy: string;
  networkRequirements: string;
  offlineCapable: boolean;
  desktopInstallerSizeEstimateMb?: number;
}

export interface ModuleRuntimeState {
  id: string;
  isInstalled: boolean;
  isEnabled: boolean;
  installedAt?: string;
  lastToggledAt?: string;
}

export interface ModuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
