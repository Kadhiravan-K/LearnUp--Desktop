/**
 * LearnUp 3.0 — Comprehensive Module Capability Registry
 * 
 * Exhaustive inventory of Mandatory Core systems and Optional Feature Packs.
 * Enforces dependency integrity, locks core systems, and defines lifecycle policies.
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
    description: 'Central learner command center showing active courses, recent milestones, study streaks, and quick resumes.',
    icon: '📊',
    route: '/dashboard',
    isLocked: true,
    defaultEnabled: true,
    dependencies: ['core-auth', 'core-library'],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Aggregated view over learning_items and video_progress.',
    dataRetentionPolicy: 'Retained permanently with account.',
    networkRequirements: 'Local reads / Supabase queries.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 1.5
  },
  'core-library': {
    id: 'core-library',
    name: 'Personal Learning Library',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Private collection of imported YouTube courses, playlists, and standalone lessons with custom metadata editing and deletion.',
    icon: '📚',
    route: '/library',
    isLocked: true,
    defaultEnabled: true,
    dependencies: ['core-auth'],
    permissions: ['storage_user_data', 'network_external'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in public.learning_items and public.playlist_videos.',
    dataRetentionPolicy: 'User items are durable. Deleting an item cascades to video progress and timestamps.',
    networkRequirements: 'HTTPS for YouTube metadata import; offline metadata browsing.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 2.0
  },
  'core-player': {
    id: 'core-player',
    name: 'Embedded Video Player & Telemetry',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Distraction-free YouTube embedded player with custom controls, auto-advance for playlists, playback speed, and second-by-second progress tracking.',
    icon: '▶️',
    route: '/library',
    isLocked: true,
    defaultEnabled: true,
    dependencies: ['core-library'],
    permissions: ['network_external', 'storage_user_data'],
    storageType: 'hybrid',
    storageDescription: 'Durable watch progress in video_progress table with local position sync.',
    dataRetentionPolicy: 'Progress records update in-place; preserved across reloads.',
    networkRequirements: 'Official YouTube embed playback; LearnUp never proxies or hosts video media.',
    offlineCapable: false, // YouTube iframe requires network
    desktopInstallerSizeEstimateMb: 2.2
  },
  'core-notes': {
    id: 'core-notes',
    name: 'Notes & Timestamped Bookmarks',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Synchronized lecture notes, video timestamp bookmarks, markdown formatting, and central Notes Hub.',
    icon: '📝',
    route: '/notes',
    isLocked: true,
    defaultEnabled: true,
    dependencies: ['core-auth'],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in public.notes and public.bookmarks with RLS isolation.',
    dataRetentionPolicy: 'Durable personal intellectual property. Never purged without explicit user action.',
    networkRequirements: 'Supabase sync; local offline cache supported.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 1.8
  },
  'core-auth': {
    id: 'core-auth',
    name: 'Authentication & Session Handling',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Secure Supabase authentication, JWT token refresh, MFA TOTP verification, and session state guards.',
    icon: '🔒',
    route: '/login',
    isLocked: true,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data', 'network_external'],
    storageType: 'hybrid',
    storageDescription: 'Session tokens in encrypted cookies/localStorage; user record in auth.users.',
    dataRetentionPolicy: 'Managed by Supabase Auth lifecycle.',
    networkRequirements: 'Auth endpoints on Supabase backend.',
    offlineCapable: false,
    desktopInstallerSizeEstimateMb: 1.0
  },
  'core-settings': {
    id: 'core-settings',
    name: 'Settings & Account Preferences',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Appearance themes (Light/Dark/System), accent colors, player layout, MFA configuration, and data exports.',
    icon: '⚙️',
    route: '/settings',
    isLocked: true,
    defaultEnabled: true,
    dependencies: ['core-auth'],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in user_settings table with localStorage offline mirror.',
    dataRetentionPolicy: 'Synced to cloud; fallback to sensible system defaults.',
    networkRequirements: 'Syncs preference mutations to backend.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 1.2
  },
  'core-modules': {
    id: 'core-modules',
    name: 'Module Manager & Capability Registry',
    version: '3.0.0',
    kind: 'core',
    category: 'core_system',
    description: 'Runtime capability coordinator, feature-flag enforcement, dependency validation, and desktop installation boundaries.',
    icon: '🎛️',
    route: '/settings',
    isLocked: true,
    defaultEnabled: true,
    dependencies: ['core-settings'],
    permissions: ['storage_user_data'],
    storageType: 'browser_storage',
    storageDescription: 'Client-side capability activation state in localStorage.',
    dataRetentionPolicy: 'Preserved per device / browser instance.',
    networkRequirements: 'Zero network required; fully deterministic offline logic.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 0.8
  },

  // =========================================================================
  // 2. OPTIONAL CAPABILITIES & MODULES (Can Be Toggled or Uninstalled)
  // =========================================================================
  'mod-career-roadmaps': {
    id: 'mod-career-roadmaps',
    name: 'AI Career Roadmaps & Trajectories',
    version: '2.5.0',
    kind: 'optional',
    category: 'career',
    description: 'Dynamic career planning wizard, structured role milestones, research resource validation, and Roadmap-to-Library synchronization.',
    icon: '🗺️',
    route: '/roadmaps',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['core-library'],
    permissions: ['storage_user_data', 'network_external'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in roadmap_tracks and roadmap_nodes.',
    dataRetentionPolicy: 'Disabling this module preserves all tracks and milestones. Data is never deleted on disable.',
    networkRequirements: 'External AI generation and YouTube verification; offline viewing of saved tracks.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 4.5
  },
  'mod-ai-assistant': {
    id: 'mod-ai-assistant',
    name: 'Contextual AI Learning Assistant',
    version: '2.2.0',
    kind: 'optional',
    category: 'ai_intelligence',
    description: 'Multi-provider Socratic AI tutor (Gemini, Claude, DeepSeek, OpenAI) with Bring-Your-Own-Key client encryption.',
    icon: '🤖',
    route: '/assistant',
    isLocked: false,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['network_external', 'storage_user_data'],
    storageType: 'browser_storage',
    storageDescription: 'BYOK API keys in encrypted localStorage; conversation memory in session.',
    dataRetentionPolicy: 'API keys stay on client. Disabling module halts AI calls without deleting keys.',
    networkRequirements: 'Direct outbound HTTPS calls to configured AI model provider.',
    offlineCapable: false,
    desktopInstallerSizeEstimateMb: 3.8
  },
  'mod-focus-timer': {
    id: 'mod-focus-timer',
    name: 'Focus Sanctuary & Precision Timer',
    version: '2.1.0',
    kind: 'optional',
    category: 'productivity',
    description: 'Pomodoro focus sessions, ambient white noise / binaural beats, study telemetry logging, and streak calculation.',
    icon: '⏱️',
    route: '/focus',
    isLocked: false,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data', 'notifications_system'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in focus_sessions table with telemetry aggregations.',
    dataRetentionPolicy: 'Focus history is permanently preserved when module is toggled off.',
    networkRequirements: 'Audio assets can be cached offline; telemetry logs to API.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 6.0 // Includes ambient audio soundscapes
  },
  'mod-calendar': {
    id: 'mod-calendar',
    name: 'Study Planner & Calendar',
    version: '2.0.0',
    kind: 'optional',
    category: 'productivity',
    description: 'Weekly study schedules, exam deadline tracking, milestone alarms, and optional Google Calendar synchronization.',
    icon: '📅',
    route: '/calendar',
    isLocked: false,
    defaultEnabled: true,
    dependencies: [],
    permissions: ['storage_user_data', 'network_external'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in study_events table.',
    dataRetentionPolicy: 'Planned study sessions remain intact if module is temporarily disabled.',
    networkRequirements: 'Supabase sync; external OAuth for Google Calendar.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 3.2
  },
  'mod-skills': {
    id: 'mod-skills',
    name: 'Skill Mastery Radar & Diagnostics',
    version: '1.8.0',
    kind: 'optional',
    category: 'learning',
    description: 'Visual radar charts mapping domain competency across algorithms, protocols, system architecture, and completed deliverables.',
    icon: '🎯',
    route: '/skills',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['core-library'],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Computed dynamically from node milestones and video watch percentages.',
    dataRetentionPolicy: 'Zero extra tables; recomputed on demand from core data.',
    networkRequirements: 'None; computed client-side.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 2.0
  },
  'mod-workspaces': {
    id: 'mod-workspaces',
    name: 'Multi-Workspace Context Switcher',
    version: '2.0.0',
    kind: 'optional',
    category: 'ecosystem',
    description: 'Separate isolated contexts for University, Work, Personal Projects, and Certification prep.',
    icon: '🗂️',
    route: '/dashboard',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['core-library'],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in workspaces table.',
    dataRetentionPolicy: 'Workspaces and course associations are preserved when disabled.',
    networkRequirements: 'Supabase API.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 1.5
  },
  'mod-vibe-code': {
    id: 'mod-vibe-code',
    name: 'Vibe Code Generator (Alpha & Bravo)',
    version: '2.4.0',
    kind: 'optional',
    category: 'learning',
    description: 'Lecture transcript code extractor (Mode Alpha) and frame visual analysis project tree generator (Mode Bravo).',
    icon: '⚡',
    route: '/library',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['core-player', 'mod-ai-assistant'],
    permissions: ['network_external'],
    storageType: 'stateless',
    storageDescription: 'Code snippets generated on demand; exported by user to files.',
    dataRetentionPolicy: 'Stateless. Exported code resides in user filesystem.',
    networkRequirements: 'Outbound AI provider inference.',
    offlineCapable: false,
    desktopInstallerSizeEstimateMb: 2.8
  },
  'mod-mermaid-output': {
    id: 'mod-mermaid-output',
    name: 'Mermaid Diagrams & Flowchart Synthesizer',
    version: '1.5.0',
    kind: 'optional',
    category: 'learning',
    description: 'Renders interactive Mermaid flowcharts, state diagrams, mind maps, and system architectures with SVG/PNG export.',
    icon: '📐',
    route: '/roadmaps',
    isLocked: false,
    defaultEnabled: true,
    dependencies: [],
    permissions: [],
    storageType: 'stateless',
    storageDescription: 'Client-side SVG rendering engine.',
    dataRetentionPolicy: 'Diagram strings stored inside roadmap node descriptions.',
    networkRequirements: 'None; 100% client-side SVG generation.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 3.5
  },
  'mod-mock-interview': {
    id: 'mod-mock-interview',
    name: 'AI Mock Interview Coach Suite',
    version: '1.2.0',
    kind: 'optional',
    category: 'career',
    description: 'Role-based technical and behavioral mock interview simulations with evaluation rubrics and answer transcripts.',
    icon: '🎤',
    route: '/assistant',
    isLocked: false,
    defaultEnabled: false,
    dependencies: ['mod-ai-assistant'],
    permissions: ['network_external', 'storage_user_data'],
    storageType: 'browser_storage',
    storageDescription: 'Interview sessions and scorecards stored in localStorage.',
    dataRetentionPolicy: 'Transcripts remain in local storage; uninstalled on user wipe.',
    networkRequirements: 'AI streaming inference.',
    offlineCapable: false,
    desktopInstallerSizeEstimateMb: 4.0
  },
  'mod-resume-builder': {
    id: 'mod-resume-builder',
    name: 'ATS Resume Builder & Career Reviewer',
    version: '1.1.0',
    kind: 'optional',
    category: 'career',
    description: 'Structured markdown resume editor with job description keyword matching and ATS export formatting.',
    icon: '📄',
    route: '/assistant',
    isLocked: false,
    defaultEnabled: false,
    dependencies: ['mod-ai-assistant'],
    permissions: ['storage_user_data'],
    storageType: 'browser_storage',
    storageDescription: 'Resume drafts stored in local storage.',
    dataRetentionPolicy: 'Drafts preserved until user explicitly clears.',
    networkRequirements: 'AI assistance optional; core editor works offline.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 2.5
  },
  'mod-community-marketplace': {
    id: 'mod-community-marketplace',
    name: 'Community Templates & Blueprints',
    version: '2.0.0',
    kind: 'optional',
    category: 'ecosystem',
    description: 'Browse, preview, and instantiate verified community roadmaps, study blueprints, and feature packs.',
    icon: '🛍️',
    route: '/dashboard',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['core-library'],
    permissions: ['network_external'],
    storageType: 'stateless',
    storageDescription: 'Curated static blueprint catalog.',
    dataRetentionPolicy: 'Imported templates become normal user library items or roadmaps.',
    networkRequirements: 'Static catalog reads.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 2.0
  },
  'mod-connectors': {
    id: 'mod-connectors',
    name: 'Connectors & Remote Vaults',
    version: '1.4.0',
    kind: 'optional',
    category: 'ecosystem',
    description: 'Integrate external sync endpoints (Obsidian, Notion, Anki, GitHub Gist) for notes and flashcard synchronization.',
    icon: '🔌',
    route: '/settings',
    isLocked: false,
    defaultEnabled: false,
    dependencies: ['core-notes'],
    permissions: ['network_external', 'storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Connector credentials and sync history in user_connectors table.',
    dataRetentionPolicy: 'Tokens stored securely server-side; revoked upon disconnect.',
    networkRequirements: 'External third-party API webhooks and REST endpoints.',
    offlineCapable: false,
    desktopInstallerSizeEstimateMb: 3.0
  },
  'mod-plugins-engine': {
    id: 'mod-plugins-engine',
    name: 'Plugins & Skills Runtime Engine',
    version: '2.0.0',
    kind: 'optional',
    category: 'ecosystem',
    description: 'Safe sandboxed runtime for custom micro-tools, Leitner spaced repetition card generators, and MCP adapters.',
    icon: '🧩',
    route: '/settings',
    isLocked: false,
    defaultEnabled: true,
    dependencies: ['core-settings'],
    permissions: ['storage_user_data'],
    storageType: 'database_relational',
    storageDescription: 'Persisted in user_plugins table.',
    dataRetentionPolicy: 'Plugin states preserved across toggles.',
    networkRequirements: 'Only for external plugin hooks.',
    offlineCapable: true,
    desktopInstallerSizeEstimateMb: 3.5
  }
};

/**
 * Validates module dependency graph integrity before enabling or disabling a module.
 */
export function validateModuleAction(
  moduleId: string,
  targetEnabled: boolean,
  currentEnabledIds: Set<string>
): ModuleValidationResult {
  const manifest = MODULE_REGISTRY[moduleId];
  if (!manifest) {
    return {
      valid: false,
      errors: [`Unknown module ID: "${moduleId}"`],
      warnings: []
    };
  }

  // Core modules cannot be disabled
  if (manifest.isLocked && !targetEnabled) {
    return {
      valid: false,
      errors: [`"${manifest.name}" is a mandatory Core system and cannot be disabled.`],
      warnings: []
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (targetEnabled) {
    // Check if all required dependencies are enabled
    for (const depId of manifest.dependencies) {
      if (!currentEnabledIds.has(depId)) {
        const depManifest = MODULE_REGISTRY[depId];
        const depName = depManifest ? depManifest.name : depId;
        errors.push(`Cannot enable "${manifest.name}" because required dependency "${depName}" is currently disabled.`);
      }
    }
  } else {
    // Check if any currently enabled module depends on this module
    for (const otherId of Array.from(currentEnabledIds)) {
      if (otherId === moduleId) continue;
      const otherManifest = MODULE_REGISTRY[otherId];
      if (otherManifest && otherManifest.dependencies.includes(moduleId)) {
        errors.push(
          `Cannot disable "${manifest.name}" because active module "${otherManifest.name}" depends on it.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function getAllModuleManifests(): ModuleManifest[] {
  return Object.values(MODULE_REGISTRY);
}

export function getCoreModuleManifests(): ModuleManifest[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.kind === 'core');
}

export function getOptionalModuleManifests(): ModuleManifest[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.kind === 'optional');
}
