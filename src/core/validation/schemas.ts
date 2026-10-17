/**
 * LearnUp Shared Core — Validation Schemas
 * Runtime input validation using Zod and AppError
 */

import { z } from 'zod';
import { AppError } from '../errors';

export const importRequestSchema = z
  .object({
    url: z.string().trim().max(10000, 'URL exceeds maximum length').optional(),
    urls: z.array(z.string().trim().min(1).max(2048)).max(100).optional(),
    title: z.string().trim().max(500).optional().nullable(),
    description: z.string().trim().max(50000).optional().nullable(),
    skillDomain: z.string().trim().max(200).optional().nullable(),
    tags: z.array(z.string().trim().max(100)).optional().nullable(),
    customThumbnailUrl: z.union([z.string().url().max(2048), z.literal('')]).optional().nullable(),
    selectedVideoIds: z
      .array(z.string().trim().min(1, 'Video ID cannot be empty').max(64, 'Video ID is too long'))
      .optional()
      .nullable()
  })
  .refine(
    (data) => Boolean(data.url && data.url.length > 0) || Boolean(data.urls && data.urls.length > 0),
    {
      message: 'URL is required',
      path: ['url']
    }
  );

export const previewCourseSchema = z
  .object({
    url: z.string().trim().max(2048).optional(),
    urls: z.array(z.string().trim().min(1).max(2048)).max(100).optional()
  })
  .refine((data) => (data.url && data.url.length > 0) || (data.urls && data.urls.length > 0), {
    message: 'URL is required'
  });

export const importCourseSchema = importRequestSchema;

export const idParamSchema = z.string().min(1, 'Identifier cannot be empty');

export const noteSchema = z.object({
  learningItemId: z.string().min(1, 'Learning item ID is required'),
  youtubeVideoId: z.string().min(1, 'YouTube video ID is required'),
  content: z.string().trim().min(1, 'Note content cannot be empty')
});

export const recordFocusSessionSchema = z.object({
  learningItemId: z.string().optional().nullable(),
  youtubeVideoId: z.string().optional().nullable(),
  durationSeconds: z.number().int().min(1).max(86400),
  mode: z.enum(['sprint', 'deep_block', 'flow_state', 'short_break', 'long_break', 'custom']),
  intervalNumber: z.number().int().min(1).default(1),
  soundscape: z.enum(['binaural_40hz', 'binaural_10hz_alpha', 'rain', 'pink_noise', 'lofi', 'silent']).default('binaural_40hz'),
  completed: z.boolean().default(true)
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((e: z.ZodIssue) => e.message).join('; ');
    throw new AppError('VALIDATION_ERROR', message, 400, result.error.format());
  }
  return result.data;
}
