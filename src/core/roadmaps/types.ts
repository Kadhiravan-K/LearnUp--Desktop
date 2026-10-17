/**
 * LearnUp Shared Core — Career & Skill Roadmap Contracts
 */

import { ExperienceLevel } from '../types';

export type LearningGoal =
  | 'job_readiness'
  | 'upskilling'
  | 'interview_preparation'
  | 'exploration';

export type ResourceType =
  | 'video'
  | 'playlist'
  | 'documentation'
  | 'article'
  | 'course'
  | 'project';

export interface ResourceProvenance {
  id: string;
  type: ResourceType;
  title: string;
  canonicalUrl: string;
  provider: string;
  description: string;
  relevantSkill: string;
  difficulty: ExperienceLevel;
  durationSeconds?: number;
  durationFormatted?: string;
}

export interface PracticeTask {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  deliverable: string;
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

export interface CuratedRoadmap {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  difficulty: ExperienceLevel;
  estimatedWeeks: number;
  tags: string[];
  phases: RoadmapPhase[];
}
