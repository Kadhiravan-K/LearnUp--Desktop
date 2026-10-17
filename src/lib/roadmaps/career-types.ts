import { z } from 'zod';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type LearningGoal =
  | 'job_readiness'
  | 'upskilling'
  | 'interview_preparation'
  | 'exploration';

export type LearningFormat = 'videos' | 'articles' | 'official_docs' | 'projects';

export type ResourceType =
  | 'video'
  | 'playlist'
  | 'documentation'
  | 'article'
  | 'course'
  | 'repository'
  | 'project';

export type VerificationStatus =
  | 'verified'
  | 'partially_verified'
  | 'user_provided'
  | 'unavailable';

export interface ResourceProvenance {
  id: string;
  type: ResourceType;
  title: string;
  canonicalUrl: string;
  provider: string;
  description: string;
  relevantSkill: string;
  difficulty: ExperienceLevel;
  language?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  verificationStatus: VerificationStatus;
  verificationTimestamp: string;
  selectionRationale: string;
  sourceMetadata?: {
    videoId?: string;
    playlistId?: string;
    thumbnailUrl?: string | null;
    channelTitle?: string;
    statusCode?: number;
    contentType?: string;
  };
}

export interface PracticeTask {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  deliverable: string;
}

export interface MilestoneAssessment {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MilestoneProject {
  id: string;
  title: string;
  description: string;
  githubTemplateUrl?: string;
  rubric: string[];
}

export interface RoadmapMilestone {
  id: string;
  phaseId: string;
  title: string;
  order: number;
  learningObjectives: string[];
  prerequisiteIds: string[];
  estimatedHours: number;
  resources: ResourceProvenance[];
  practiceTasks: PracticeTask[];
  project?: MilestoneProject;
  assessment?: MilestoneAssessment;
  completionCriteria: string[];
}

export interface RoadmapPhase {
  id: string;
  title: string;
  objective: string;
  order: number;
  estimatedHours: number;
  milestones: RoadmapMilestone[];
}

export interface CareerRoadmapSource {
  title: string;
  url: string;
  authority: string;
}

export type ResearchProviderType =
  | 'gemini_ai'
  | 'youtube_search_api'
  | 'curated_offline_benchmark'
  | 'hybrid_verified';

export interface CareerRoadmap {
  id: string;
  title: string;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  learningGoal: LearningGoal;
  weeklyHours: number;
  estimatedWeeks: number;
  existingSkills: string[];
  strengthenSkills: string[];
  skipSkills: string[];
  preferredLanguage: string;
  preferredFormats: LearningFormat[];
  targetMarket?: string;
  jobDescriptionSnippet?: string;
  skillGapSummary: string;
  phases: RoadmapPhase[];
  sources: CareerRoadmapSource[];
  generatedAt: string;
  generationStatus: 'draft' | 'researching' | 'validating' | 'ready' | 'failed';
  medicalDisclaimer?: string;
  mermaidDiagram?: string;
  mermaidMindmap?: string;
  researchProvider?: ResearchProviderType;
  isLiveResearched?: boolean;
  provenanceNote?: string;
  retrievalTimestamp?: string;
  researchConfidence?: number;
}

export interface CareerWizardInput {
  targetRole: string;
  experienceLevel: ExperienceLevel;
  existingSkills: string[];
  strengthenSkills: string[];
  skipSkills: string[];
  weeklyHours: number;
  preferredTimelineWeeks: number;
  learningGoal: LearningGoal;
  preferredLanguage: string;
  preferredFormats: LearningFormat[];
  targetMarket?: string;
  jobDescriptionText?: string;
  isRichUiEnabled?: boolean;
}

// ----------------------------------------------------------------------------
// Selective AI Regeneration & Refinement Contracts
// ----------------------------------------------------------------------------

export type MilestoneRefinementAction =
  | 'find_better_video'
  | 'replace_unavailable_resource'
  | 'add_practical_projects'
  | 'simplify_topic'
  | 'deepen_advanced'
  | 'refresh_resources';

export interface MilestoneDiffChange {
  field: string;
  before: string;
  after: string;
}

export interface MilestoneDiff {
  milestoneId: string;
  action: MilestoneRefinementAction;
  summary: string;
  changes: MilestoneDiffChange[];
}

export interface RefineMilestoneInput {
  milestone: RoadmapMilestone;
  action: MilestoneRefinementAction;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  weeklyHours: number;
  specificFeedback?: string;
}

// ----------------------------------------------------------------------------
// Complete Saved Roadmap Milestone Data Contract
// ----------------------------------------------------------------------------

export interface SavedMilestonePayload {
  milestoneId: string;
  phaseId: string;
  phaseTitle: string;
  learningObjectives: string[];
  resources: ResourceProvenance[];
  practiceTasks: PracticeTask[];
  assessment?: MilestoneAssessment;
  project?: MilestoneProject;
  estimatedHours: number;
  completionCriteria: string[];
  completedDeliverableIds?: string[];
  quizPassed?: boolean;
}
