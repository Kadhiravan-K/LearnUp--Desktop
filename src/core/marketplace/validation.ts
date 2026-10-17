/**
 * LearnUp Community Marketplace — Manifest Validation Services
 * Provides unified schema parsing, strict capability checks, and error formatting in LearnUp-Desktop.
 */

import {
  SkillManifest,
  SkillManifestSchema,
  TemplateManifest,
  TemplateManifestSchema,
  PluginManifest,
  PluginManifestSchema,
  AnyManifest,
  AnyManifestSchema,
  ALLOWED_PLUGIN_CAPABILITIES,
} from './contracts';
import { validateSkillManifestGraph } from './dag';

export type ValidationOutcome<T> =
  | { success: true; data: T; warnings: string[]; sortedNodeIds?: string[] }
  | { success: false; errors: string[] };

/**
 * Validates a SkillManifest against Zod schema, YouTube requirements, and DAG acyclicity.
 */
export function validateSkillManifest(raw: unknown): ValidationOutcome<SkillManifest> {
  const parseResult = SkillManifestSchema.safeParse(raw);

  if (!parseResult.success) {
    const issues = parseResult.error.issues || (parseResult.error as any).errors || [];
    const errors = issues.map((e: any) => {
      const field = Array.isArray(e.path) ? e.path.join('.') : '';
      return field ? `[${field}] ${e.message}` : e.message;
    });
    return { success: false, errors };
  }

  const manifest = parseResult.data;

  // Run DAG graph validation
  const graphResult = validateSkillManifestGraph(manifest);
  if (!graphResult.isValid) {
    return { success: false, errors: graphResult.errors };
  }

  return {
    success: true,
    data: manifest,
    warnings: graphResult.warnings,
    sortedNodeIds: graphResult.sortedNodeIds,
  };
}

/**
 * Validates a TemplateManifest against Zod schema and disallowed custom code.
 */
export function validateTemplateManifest(raw: unknown): ValidationOutcome<TemplateManifest> {
  const parseResult = TemplateManifestSchema.safeParse(raw);

  if (!parseResult.success) {
    const issues = parseResult.error.issues || (parseResult.error as any).errors || [];
    const errors = issues.map((e: any) => {
      const field = Array.isArray(e.path) ? e.path.join('.') : '';
      return field ? `[${field}] ${e.message}` : e.message;
    });
    return { success: false, errors };
  }

  return {
    success: true,
    data: parseResult.data,
    warnings: [],
  };
}

/**
 * Validates a PluginManifest against Zod schema and strict capability allowlist.
 * Explicitly detects and rejects dangerous capabilities.
 */
export function validatePluginManifest(raw: unknown): ValidationOutcome<PluginManifest> {
  // Check for dangerous capabilities before parsing to give explicit error feedback
  if (typeof raw === 'object' && raw !== null && 'capabilities' in raw) {
    const rawCaps = (raw as Record<string, unknown>).capabilities;
    if (Array.isArray(rawCaps)) {
      const disallowed = rawCaps.filter(
        (c) => typeof c === 'string' && !(ALLOWED_PLUGIN_CAPABILITIES as readonly string[]).includes(c)
      );
      if (disallowed.length > 0) {
        return {
          success: false,
          errors: [
            `Disallowed capabilities detected: [${disallowed.join(', ')}]. ` +
            `Plugins may only request permitted capabilities: [${ALLOWED_PLUGIN_CAPABILITIES.join(', ')}].`,
          ],
        };
      }
    }
  }

  const parseResult = PluginManifestSchema.safeParse(raw);

  if (!parseResult.success) {
    const issues = parseResult.error.issues || (parseResult.error as any).errors || [];
    const errors = issues.map((e: any) => {
      const field = Array.isArray(e.path) ? e.path.join('.') : '';
      return field ? `[${field}] ${e.message}` : e.message;
    });
    return { success: false, errors };
  }

  return {
    success: true,
    data: parseResult.data,
    warnings: [],
  };
}

/**
 * Validates any manifest (Skill, Template, or Plugin) based on its category.
 */
export function validateAnyManifest(raw: unknown): ValidationOutcome<AnyManifest> {
  if (typeof raw !== 'object' || raw === null || !('category' in raw)) {
    return {
      success: false,
      errors: ['Manifest must be an object with a "category" field ("skill", "template", or "plugin").'],
    };
  }

  const category = (raw as Record<string, unknown>).category;

  if (category === 'skill') {
    return validateSkillManifest(raw);
  } else if (category === 'template') {
    return validateTemplateManifest(raw);
  } else if (category === 'plugin') {
    return validatePluginManifest(raw);
  } else {
    return {
      success: false,
      errors: [`Unsupported manifest category "${String(category)}". Supported categories: skill, template, plugin.`],
    };
  }
}
