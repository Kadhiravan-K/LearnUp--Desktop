/**
 * LearnUp Shared Core — Roadmap Validation Schemas
 */

import { z } from 'zod';

export const experienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const resourceTypeSchema = z.enum([
  'video',
  'playlist',
  'documentation',
  'article',
  'course',
  'project'
]);

export const resourceProvenanceSchema = z.object({
  id: z.string().min(1),
  type: resourceTypeSchema,
  title: z.string().trim().min(1).max(250),
  canonicalUrl: z.string().url('Must be a valid URL'),
  provider: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(''),
  relevantSkill: z.string().trim().min(1).max(120),
  difficulty: experienceLevelSchema,
  durationSeconds: z.number().int().min(0).optional(),
  durationFormatted: z.string().max(40).optional()
});

export const practiceTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000),
  estimatedMinutes: z.number().int().min(1).max(1440),
  deliverable: z.string().trim().max(300)
});

export const roadmapMilestoneSchema = z.object({
  id: z.string().min(1),
  phaseId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  order: z.number().int().min(1),
  learningObjectives: z.array(z.string().trim().min(1)).min(1),
  prerequisiteIds: z.array(z.string()).default([]),
  estimatedHours: z.number().min(0.5).max(500),
  resources: z.array(resourceProvenanceSchema),
  practiceTasks: z.array(practiceTaskSchema).default([]),
  completionCriteria: z.array(z.string().trim().min(1)).min(1)
});

export const roadmapPhaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(500),
  order: z.number().int().min(1),
  estimatedHours: z.number().min(1).max(1000),
  milestones: z.array(roadmapMilestoneSchema)
});

export const curatedRoadmapSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000),
  category: z.string().trim().min(1),
  author: z.string().trim().min(1),
  difficulty: experienceLevelSchema,
  estimatedWeeks: z.number().int().min(1),
  tags: z.array(z.string().trim()),
  phases: z.array(roadmapPhaseSchema)
});
