import { z } from 'zod';

export const experienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const learningGoalSchema = z.enum([
  'job_readiness',
  'upskilling',
  'interview_preparation',
  'exploration'
]);

export const learningFormatSchema = z.enum(['videos', 'articles', 'official_docs', 'projects']);

export const resourceTypeSchema = z.enum([
  'video',
  'playlist',
  'documentation',
  'article',
  'course',
  'repository',
  'project'
]);

export const verificationStatusSchema = z.enum([
  'verified',
  'partially_verified',
  'user_provided',
  'unavailable'
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
  language: z.string().max(40).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  durationFormatted: z.string().max(40).optional(),
  verificationStatus: verificationStatusSchema,
  verificationTimestamp: z.string(),
  selectionRationale: z.string().max(500).default(''),
  sourceMetadata: z
    .object({
      videoId: z.string().optional(),
      playlistId: z.string().optional(),
      thumbnailUrl: z.string().nullable().optional(),
      channelTitle: z.string().optional(),
      statusCode: z.number().optional(),
      contentType: z.string().optional()
    })
    .optional()
});

export const practiceTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000),
  estimatedMinutes: z.number().int().min(5).max(1440),
  deliverable: z.string().trim().max(300)
});

export const milestoneAssessmentSchema = z.object({
  id: z.string().min(1),
  question: z.string().trim().min(5).max(500),
  options: z.array(z.string().trim().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().trim().max(1000)
});

export const milestoneProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  githubTemplateUrl: z.string().url().optional(),
  rubric: z.array(z.string().trim().min(1)).min(1).max(10)
});

export const roadmapMilestoneSchema = z.object({
  id: z.string().min(1),
  phaseId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  order: z.number().int().min(1),
  learningObjectives: z.array(z.string().trim().min(1)).min(1),
  prerequisiteIds: z.array(z.string()).default([]),
  estimatedHours: z.number().min(0.5).max(200),
  resources: z.array(resourceProvenanceSchema),
  practiceTasks: z.array(practiceTaskSchema).default([]),
  project: milestoneProjectSchema.optional(),
  assessment: milestoneAssessmentSchema.optional(),
  completionCriteria: z.array(z.string().trim().min(1)).min(1)
});

export const roadmapPhaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(500),
  order: z.number().int().min(1),
  estimatedHours: z.number().min(1).max(1000),
  milestones: z.array(roadmapMilestoneSchema).min(1)
});

export const careerRoadmapSourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().url(),
  authority: z.string().trim().min(1).max(120)
});

export const careerRoadmapSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  targetRole: z.string().trim().min(1).max(150),
  experienceLevel: experienceLevelSchema,
  learningGoal: learningGoalSchema,
  weeklyHours: z.number().int().min(1).max(100),
  estimatedWeeks: z.number().int().min(1).max(104),
  existingSkills: z.array(z.string().trim().min(1)).default([]),
  strengthenSkills: z.array(z.string().trim().min(1)).default([]),
  skipSkills: z.array(z.string().trim().min(1)).default([]),
  preferredLanguage: z.string().trim().default('English'),
  preferredFormats: z.array(learningFormatSchema).min(1),
  targetMarket: z.string().trim().max(100).optional(),
  jobDescriptionSnippet: z.string().max(5000).optional(),
  skillGapSummary: z.string().trim().min(1).max(2000),
  phases: z.array(roadmapPhaseSchema).min(1),
  sources: z.array(careerRoadmapSourceSchema).default([]),
  generatedAt: z.string(),
  generationStatus: z.enum(['draft', 'researching', 'validating', 'ready', 'failed']),
  medicalDisclaimer: z.string().optional(),
  mermaidDiagram: z.string().optional(),
  mermaidMindmap: z.string().optional(),
  researchProvider: z.enum(['gemini_ai', 'youtube_search_api', 'curated_offline_benchmark', 'hybrid_verified']).optional(),
  isLiveResearched: z.boolean().optional(),
  provenanceNote: z.string().optional(),
  retrievalTimestamp: z.string().optional(),
  researchConfidence: z.number().min(0).max(1).optional()
});

export const careerWizardInputSchema = z.object({
  targetRole: z.string().trim().min(2, 'Job role is required').max(150),
  experienceLevel: experienceLevelSchema,
  existingSkills: z.array(z.string().trim().min(1).max(50)).default([]),
  strengthenSkills: z.array(z.string().trim().min(1).max(50)).default([]),
  skipSkills: z.array(z.string().trim().min(1).max(50)).default([]),
  weeklyHours: z.number().int().min(1).max(80).default(10),
  preferredTimelineWeeks: z.number().int().min(2).max(52).default(12),
  learningGoal: learningGoalSchema.default('job_readiness'),
  preferredLanguage: z.string().trim().min(2).max(40).default('English'),
  preferredFormats: z
    .array(learningFormatSchema)
    .min(1, 'Select at least one preferred format')
    .default(['videos', 'official_docs', 'projects']),
  targetMarket: z.string().trim().max(100).optional().default('Global / Remote'),
  jobDescriptionText: z.string().trim().max(10000).optional(),
  isRichUiEnabled: z.boolean().default(true)
});

export const milestoneRefinementActionSchema = z.enum([
  'find_better_video',
  'replace_unavailable_resource',
  'add_practical_projects',
  'simplify_topic',
  'deepen_advanced',
  'refresh_resources'
]);

export const refineMilestoneInputSchema = z.object({
  milestone: roadmapMilestoneSchema,
  action: milestoneRefinementActionSchema,
  targetRole: z.string().trim().min(1).max(150),
  experienceLevel: experienceLevelSchema,
  weeklyHours: z.number().int().min(1).max(100).default(10),
  specificFeedback: z.string().max(1000).optional()
});

export type CareerRoadmapValidated = z.infer<typeof careerRoadmapSchema>;
export type CareerWizardInputValidated = z.infer<typeof careerWizardInputSchema>;
export type RefineMilestoneInputValidated = z.infer<typeof refineMilestoneInputSchema>;
