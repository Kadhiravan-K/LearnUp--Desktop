/**
 * LearnUp Shared Core — Module Capability Registry
 * Exhaustive catalog of Mandatory Core systems and Optional Feature modules.
 */

import { ModuleManifest, ModuleValidationResult } from './types';

export const MODULE_REGISTRY: Record<string, ModuleManifest> = {
  // =========================================================================
  // 1. MANDATORY CORE CAPABILITIES (Always Enabled, Cannot Be Disabled)
  // =========================================================================
  'core-dashboard': {
    id: 'core-dashboard',
    name: 'Dashboard & Progress Overview',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Central learner command center showing active courses, recent milestones, and quick resumes.',
    icon: '📊',
    route: 'dashboard',
    isLocked: true,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Aggregated view over learning_items and progress.',
    dataRetentionPolicy: 'Retained permanently in local SQLite.',
    networkRequirements: 'Offline capable.',
    offlineCapable: true
  },
  'core-library': {
    id: 'core-library',
    name: 'Personal Learning Library',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Private collection of imported YouTube courses, playlists, and standalone lessons.',
    icon: '📚',
    route: 'library',
    isLocked: true,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data', 'network_external'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in SQLite learning_items.',
    dataRetentionPolicy: 'Durable user items.',
    networkRequirements: 'Network for video metadata import; offline metadata browsing.',
    offlineCapable: true
  },
  'core-player': {
    id: 'core-player',
    name: 'Embedded Video Player',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Distraction-free YouTube embedded player with progress tracking.',
    icon: '▶️',
    route: 'library',
    isLocked: true,
    defaultEnabled: true,
    dependencies: ['core-library'],
    permissions: ['network_external', 'storage_user_data'],
    storageType: 'hybrid',
    storageDescription: 'Progress recorded in local SQLite.',
    dataRetentionPolicy: 'Progress preserved across reloads.',
    networkRequirements: 'Official YouTube embed playback.',
    offlineCapable: false
  },
  'core-notes': {
    id: 'core-notes',
    name: 'Offline Notes & Bookmarks',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Synchronized lecture notes, video timestamp bookmarks, and central Notes Hub.',
    icon: '📝',
    route: 'notes',
    isLocked: true,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in SQLite notes and bookmarks tables.',
    dataRetentionPolicy: 'Durable personal data. Never purged without explicit action.',
    networkRequirements: '100% Offline Capable.',
    offlineCapable: true
  },

  // =========================================================================
  // 2. OPTIONAL FEATURE MODULES (Configurable in Settings)
  // =========================================================================
  'feature-focus': {
    id: 'feature-focus',
    name: 'Focus Sanctuary & Precision Timer',
    version: '3.0.0',
    kind: 'optional',
    category: 'productivity',
    description: 'Pomodoro focus timer with customized sprint intervals and ambient soundscapes.',
    icon: '⏱️',
    route: 'focus',
    isLocked: false,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data'],
    storageType: 'browser_storage',
    storageDescription: 'Local timer preferences and completed intervals.',
    dataRetentionPolicy: 'Persisted locally in profile storage.',
    networkRequirements: '100% Offline Capable.',
    offlineCapable: true
  },
  'feature-roadmaps': {
    id: 'feature-roadmaps',
    name: 'Learning Roadmaps & Progression',
    version: '3.0.0',
    kind: 'optional',
    category: 'career',
    description: 'Step-by-step career and skill mastery roadmaps with structured phases.',
    icon: '🗺️',
    route: 'dashboard',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['core-library'],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Roadmap tracks and milestone progression.',
    dataRetentionPolicy: 'Durable user tracks.',
    networkRequirements: 'Offline capable with bundled templates.',
    offlineCapable: true
  },
  'feature-analytics': {
    id: 'feature-analytics',
    name: 'Deep Analytics & Consistency Heatmaps',
    version: '3.0.0',
    kind: 'optional',
    category: 'learning',
    description: 'Study streaks, hours logged, and consistency heatmaps across all learning modalities.',
    icon: '📈',
    route: 'dashboard',
    isLocked: false,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data'],
    storageType: 'hybrid',
    storageDescription: 'Aggregated telemetry computed from local activities.',
    dataRetentionPolicy: 'Derived metrics.',
    networkRequirements: '100% Offline Capable.',
    offlineCapable: true
  },
  'feature-rewards': {
    id: 'feature-rewards',
    name: 'Milestone Rewards & Streaks',
    version: '3.0.0',
    kind: 'optional',
    category: 'productivity',
    description: 'Gamified achievement badges and active study streak celebrations.',
    icon: '🏆',
    route: 'dashboard',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['feature-analytics'],
    permissions: ['storage_user_data'],
    storageType: 'browser_storage',
    storageDescription: 'Badge achievements and streak milestones.',
    dataRetentionPolicy: 'Persisted locally.',
    networkRequirements: '100% Offline Capable.',
    offlineCapable: true
  }
};

/**
 * Validates enabling or disabling a module based on dependencies and core locks.
 */
export function validateModuleAction(
  action: 'enable' | 'disable',
  moduleId: string,
  currentEnabledIds: string[]
): ModuleValidationResult {
  const manifest = MODULE_REGISTRY[moduleId];
  if (!manifest) {
    return {
      valid: false,
      errors: [`Module "${moduleId}" is not registered.`],
      warnings: []
    };
  }

  if (action === 'disable') {
    if (manifest.isLocked) {
      return {
        valid: false,
        errors: [`Core module "${manifest.name}" cannot be disabled.`],
        warnings: []
      };
    }

    // Check if any active module depends on this one
    const dependents = Object.values(MODULE_REGISTRY).filter(
      (m) => currentEnabledIds.includes(m.id) && m.dependencies.includes(moduleId)
    );
    if (dependents.length > 0) {
      return {
        valid: false,
        errors: [
          `Cannot disable "${manifest.name}" because the following active modules depend on it: ${dependents
            .map((d) => d.name)
            .join(', ')}`
        ],
        warnings: []
      };
    }
  }

  if (action === 'enable') {
    // Check missing dependencies
    const missing = manifest.dependencies.filter((depId) => !currentEnabledIds.includes(depId));
    if (missing.length > 0) {
      const missingNames = missing.map((id) => MODULE_REGISTRY[id]?.name || id);
      return {
        valid: false,
        errors: [`Cannot enable "${manifest.name}" without active dependencies: ${missingNames.join(', ')}`],
        warnings: []
      };
    }
  }

  return { valid: true, errors: [], warnings: [] };
}
