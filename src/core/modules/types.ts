/**
 * LearnUp Shared Core — Module Capability Contracts
 * Defines types for core vs optional modules, dependencies, and permissions.
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
  | 'database_relational'  // Native SQLite / Supabase tables
  | 'browser_storage'      // localStorage
  | 'hybrid'               // Local SQLite + optional cloud sync
  | 'stateless';           // Ephemeral

export type PermissionScope =
  | 'network_external'     // External API calls (YouTube, etc.)
  | 'storage_user_data'    // Durable local storage
  | 'filesystem_local'     // Desktop filesystem access
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
  isLocked: boolean; // Core modules are locked (cannot be disabled)
  defaultEnabled: boolean;
  dependencies: string[]; // Module IDs that must be active
  permissions: PermissionScope[];
  storageType: StorageRequirementType;
  storageDescription: string;
  dataRetentionPolicy: string;
  networkRequirements: string;
  offlineCapable: boolean;
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
