/**
 * LearnUp Community Marketplace — Domain Contracts and Zod Schemas
 * Shared foundation for Skills, Templates, and Plugins across Web and Desktop.
 */

import { z } from 'zod';

// ==========================================
// 1. Primitive Enums and Types
// ==========================================

export const MarketplaceCategorySchema = z.enum(['skill', 'template', 'plugin']);
export type MarketplaceCategory = z.infer<typeof MarketplaceCategorySchema>;

export const MarketplaceItemStatusSchema = z.enum([
  'draft',
  'pending_review',
  'published',
  'archived',
  'rejected',
]);
export type MarketplaceItemStatus = z.infer<typeof MarketplaceItemStatusSchema>;

export const PricingModelSchema = z.enum(['free', 'paid']);
export type PricingModel = z.infer<typeof PricingModelSchema>;

export const DifficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const CreatorGrantStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'revoked',
]);
export type CreatorGrantStatus = z.infer<typeof CreatorGrantStatusSchema>;

export const ReportReasonSchema = z.enum([
  'inappropriate',
  'broken_links',
  'copyright',
  'spam',
  'other',
]);
export type ReportReason = z.infer<typeof ReportReasonSchema>;

// Strict 11-character YouTube video ID regex
export const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
export const YOUTUBE_PLAYLIST_ID_REGEX = /^[a-zA-Z0-9_-]{2,}$/;
export const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ==========================================
// 2. Skill Roadmap Manifest
// ==========================================

export const SkillNodeSchema = z.object({
  id: z
    .string()
    .min(1, 'Node ID is required')
    .max(64, 'Node ID must be 64 characters or fewer')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Node ID must contain only alphanumeric, underscore, or hyphen characters'),
  title: z
    .string()
    .trim()
    .min(1, 'Node title is required')
    .max(200, 'Node title must be 200 characters or fewer'),
  description: z
    .string()
    .max(2000, 'Node description must be 2000 characters or fewer')
    .default(''),
  youtubeVideoId: z
    .string()
    .regex(YOUTUBE_VIDEO_ID_REGEX, 'Must be a valid 11-character YouTube video ID')
    .optional(),
  youtubePlaylistId: z
    .string()
    .regex(YOUTUBE_PLAYLIST_ID_REGEX, 'Must be a valid YouTube playlist ID')
    .optional(),
  durationSeconds: z
    .number()
    .int('Duration must be an integer')
    .nonnegative('Duration must be non-negative')
    .optional(),
  keyTakeaways: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
}).refine(
  (data) => Boolean(data.youtubeVideoId || data.youtubePlaylistId),
  {
    message: 'Each skill node must specify at least a youtubeVideoId or youtubePlaylistId',
    path: ['youtubeVideoId'],
  }
);
export type SkillNode = z.infer<typeof SkillNodeSchema>;

export const SkillEdgeSchema = z.object({
  source: z.string().min(1, 'Source node ID is required'),
  target: z.string().min(1, 'Target node ID is required'),
}).refine(
  (edge) => edge.source !== edge.target,
  {
    message: 'Self-referencing edges are not allowed in DAG',
    path: ['target'],
  }
);
export type SkillEdge = z.infer<typeof SkillEdgeSchema>;

export const SkillManifestSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  category: z.literal('skill'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be 5000 characters or fewer'),
  domain: z.string().trim().min(1, 'Domain is required').max(100),
  difficulty: DifficultyLevelSchema,
  estimatedHours: z
    .number()
    .positive('Estimated hours must be greater than zero')
    .max(1000, 'Estimated hours must not exceed 1000'),
  nodes: z
    .array(SkillNodeSchema)
    .min(1, 'Skill manifest must contain at least one learning node'),
  edges: z.array(SkillEdgeSchema).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;

// ==========================================
// 3. Template Manifest
// ==========================================

export const TemplateModulesConfigSchema = z.object({
  enabledModuleIds: z.array(z.string().trim().min(1)),
  defaultModule: z.string().trim().optional(),
});

export const TemplateFocusTimerConfigSchema = z.object({
  defaultMinutes: z.number().int().min(1).max(180).optional(),
  shortBreakMinutes: z.number().int().min(1).max(60).optional(),
  longBreakMinutes: z.number().int().min(1).max(120).optional(),
  soundEnabled: z.boolean().optional(),
});

export const TemplateAppearanceConfigSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  accentColor: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Must be a valid hex color code')
    .optional(),
  // Explicitly deny arbitrary CSS injection
  customCssAllowed: z.literal(false).optional().default(false),
});

export const TemplateStarterBookmarkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (val) => {
        try {
          const u = new URL(val);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Only http: and https: protocols are permitted for bookmark URLs' }
    ),
  category: z.string().trim().max(100).optional(),
});

export const TemplateStarterNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20000),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
});

export const TemplateManifestSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  category: z.literal('template'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be 5000 characters or fewer'),
  targetDomain: z.string().trim().min(1, 'Target domain is required').max(100),
  modulesConfig: TemplateModulesConfigSchema,
  focusTimerConfig: TemplateFocusTimerConfigSchema.optional(),
  appearanceConfig: TemplateAppearanceConfigSchema.optional(),
  starterBookmarks: z.array(TemplateStarterBookmarkSchema).optional().default([]),
  starterNotes: z.array(TemplateStarterNoteSchema).optional().default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;

// ==========================================
// 4. Plugin Manifest (Strict Capabilities Allowlist)
// ==========================================

export const ALLOWED_PLUGIN_CAPABILITIES = [
  'storage:local',
  'ui:sidebar-badge',
  'ui:theme-override',
  'ui:modal',
  'analytics:streak-hook',
  'export:markdown',
  'export:json',
  'import:markdown',
  'shortcuts:register',
] as const;

export const PluginCapabilitySchema = z.enum(ALLOWED_PLUGIN_CAPABILITIES);
export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

export const PluginManifestSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  category: z.literal('plugin'),
  pluginId: z
    .string()
    .min(3, 'Plugin ID must be at least 3 characters')
    .max(64, 'Plugin ID must be 64 characters or fewer')
    .regex(SLUG_REGEX, 'Plugin ID must be lowercase alphanumeric with hyphens'),
  name: z
    .string()
    .trim()
    .min(3, 'Plugin name must be at least 3 characters')
    .max(100, 'Plugin name must be 100 characters or fewer'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be 2000 characters or fewer'),
  version: z
    .string()
    .regex(SEMVER_REGEX, 'Version must follow SemVer format (e.g., 1.0.0)'),
  author: z
    .string()
    .trim()
    .min(2, 'Author name must be at least 2 characters')
    .max(100, 'Author name must be 100 characters or fewer'),
  icon: z.string().trim().max(50).optional(),
  capabilities: z
    .array(PluginCapabilitySchema)
    .default([]),
  settingsSchema: z.record(z.string(), z.any()).optional().default({}),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Unified Manifest Union
export const AnyManifestSchema = z.discriminatedUnion('category', [
  SkillManifestSchema,
  TemplateManifestSchema,
  PluginManifestSchema,
]);
export type AnyManifest = z.infer<typeof AnyManifestSchema>;

// ==========================================
// 5. Marketplace Item & Version Entities
// ==========================================

export const MarketplaceItemSchema = z.object({
  id: z.string().uuid('Item ID must be a valid UUID'),
  slug: z.string().regex(SLUG_REGEX, 'Slug must be lower-kebab-case'),
  category: MarketplaceCategorySchema,
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().max(500).default(''),
  description: z.string().trim().max(10000).default(''),
  authorId: z.string().uuid('Author ID must be a valid UUID'),
  authorName: z.string().trim().min(1).max(100),
  status: MarketplaceItemStatusSchema.default('draft'),
  pricing: PricingModelSchema.default('free'),
  priceCents: z.number().int().nonnegative().default(0),
  currentVersion: z.string().regex(SEMVER_REGEX).default('1.0.0'),
  domain: z.string().trim().min(1).default('General'),
  difficulty: DifficultyLevelSchema.optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  ratingAverage: z.number().min(0).max(5).default(0),
  ratingBayesian: z.number().min(0).max(5).default(0),
  ratingCount: z.number().int().nonnegative().default(0),
  installCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MarketplaceItem = z.infer<typeof MarketplaceItemSchema>;

export const MarketplaceVersionSchema = z.object({
  id: z.string().uuid('Version ID must be a valid UUID'),
  itemId: z.string().uuid('Item ID must be a valid UUID'),
  version: z.string().regex(SEMVER_REGEX, 'Must be valid SemVer'),
  changelog: z.string().max(5000).default(''),
  manifest: AnyManifestSchema,
  createdAt: z.string().datetime(),
});
export type MarketplaceVersion = z.infer<typeof MarketplaceVersionSchema>;

// ==========================================
// 6. Creator Grants & Requests
// ==========================================

export const CreatorGrantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: CreatorGrantStatusSchema.default('approved'),
  grantedBy: z.string().uuid().nullable().optional(),
  reason: z.string().default(''),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CreatorGrant = z.infer<typeof CreatorGrantSchema>;

export const CreatorRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  bio: z.string().trim().min(10).max(2000),
  portfolioUrl: z.string().url().optional().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  reviewerId: z.string().uuid().optional().nullable(),
  reviewerNotes: z.string().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CreatorRequest = z.infer<typeof CreatorRequestSchema>;

// ==========================================
// 7. Installations, Reviews, Comments, Reports
// ==========================================

export const MarketplaceInstallationSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  userId: z.string().uuid(),
  versionInstalled: z.string().regex(SEMVER_REGEX),
  status: z.enum(['active', 'uninstalled']).default('active'),
  installedAt: z.string().datetime(),
  uninstalledAt: z.string().datetime().nullable().optional(),
});
export type MarketplaceInstallation = z.infer<typeof MarketplaceInstallationSchema>;

export const MarketplaceReviewSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().max(3000).default(''),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MarketplaceReview = z.infer<typeof MarketplaceReviewSchema>;

export const MarketplaceCommentSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  commentText: z.string().trim().min(1).max(2000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MarketplaceComment = z.infer<typeof MarketplaceCommentSchema>;

export const MarketplaceReportSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  reporterUserId: z.string().uuid(),
  reason: ReportReasonSchema,
  details: z.string().trim().min(5).max(2000),
  status: z.enum(['pending', 'reviewed', 'dismissed', 'resolved']).default('pending'),
  createdAt: z.string().datetime(),
});
export type MarketplaceReport = z.infer<typeof MarketplaceReportSchema>;

export const MarketplaceStatsSchema = z.object({
  itemId: z.string().uuid(),
  totalInstalls: z.number().int().nonnegative().default(0),
  activeInstalls: z.number().int().nonnegative().default(0),
  totalReviews: z.number().int().nonnegative().default(0),
  averageRating: z.number().min(0).max(5).default(0),
  bayesianRating: z.number().min(0).max(5).default(0),
  updatedAt: z.string().datetime(),
});
export type MarketplaceStats = z.infer<typeof MarketplaceStatsSchema>;
