/**
 * LearnUp Shared Core — Curated Offline Roadmap Templates
 * Built-in tracks available offline without external server dependencies.
 */

import { CuratedRoadmap } from './types';

export const CURATED_OFFLINE_ROADMAPS: CuratedRoadmap[] = [
  {
    id: 'roadmap-fullstack-ts',
    title: 'Full-Stack TypeScript & React Mastery',
    description: 'Comprehensive pathway covering modern TypeScript, React, state management, and backend architecture.',
    category: 'Software Engineering',
    author: 'LearnUp Curated',
    difficulty: 'intermediate',
    estimatedWeeks: 12,
    tags: ['TypeScript', 'React', 'Node.js', 'System Architecture'],
    phases: [
      {
        id: 'phase-1-ts-foundations',
        title: 'Phase 1: Advanced TypeScript & Modern React',
        objective: 'Master strict TypeScript patterns, generics, hooks, and component lifecycle.',
        order: 1,
        estimatedHours: 35,
        milestones: [
          {
            id: 'm1-ts-types',
            phaseId: 'phase-1-ts-foundations',
            title: 'Type Systems & Generic Interfaces',
            order: 1,
            learningObjectives: ['Understand conditional types', 'Build utility types', 'Enforce runtime boundaries'],
            prerequisiteIds: [],
            estimatedHours: 15,
            resources: [
              {
                id: 'res-ts-video',
                type: 'video',
                title: 'TypeScript in 100 Seconds & Advanced Patterns',
                canonicalUrl: 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA',
                provider: 'YouTube',
                description: 'Overview of core typing concepts and strict mode advantages.',
                relevantSkill: 'TypeScript',
                difficulty: 'intermediate',
                durationSeconds: 1200,
                durationFormatted: '20:00'
              }
            ],
            practiceTasks: [
              {
                id: 'task-ts-1',
                title: 'Build type-safe event emitter',
                description: 'Implement a strongly typed EventEmitter class using generic record constraints.',
                estimatedMinutes: 60,
                deliverable: 'EventEmitter.ts with full unit tests'
              }
            ],
            completionCriteria: ['Passed test suite with zero any assertions']
          }
        ]
      },
      {
        id: 'phase-2-offline-storage',
        title: 'Phase 2: Local-First & SQLite Storage',
        objective: 'Architect robust offline data sync, WAL journaling, and local-first databases.',
        order: 2,
        estimatedHours: 40,
        milestones: [
          {
            id: 'm2-sqlite-wal',
            phaseId: 'phase-2-offline-storage',
            title: 'SQLite Schemas & Transaction Isolation',
            order: 1,
            learningObjectives: ['Design idempotent schemas', 'Enable WAL mode', 'Implement tombstoning'],
            prerequisiteIds: ['m1-ts-types'],
            estimatedHours: 20,
            resources: [
              {
                id: 'res-sqlite-video',
                type: 'video',
                title: 'Why SQLite is Taking Over Local Applications',
                canonicalUrl: 'https://www.youtube.com/watch?v=cz3wD_wL13U',
                provider: 'YouTube',
                description: 'In-depth exploration of embedded SQLite in desktop and mobile environments.',
                relevantSkill: 'Databases',
                difficulty: 'intermediate',
                durationSeconds: 1800,
                durationFormatted: '30:00'
              }
            ],
            practiceTasks: [
              {
                id: 'task-sqlite-1',
                title: 'Create SQLite schema with WAL migration',
                description: 'Write DDL statements for notes, progress, and audit event tables.',
                estimatedMinutes: 90,
                deliverable: 'schema.sql with migration verification'
              }
            ],
            completionCriteria: ['Verified WAL journaling and foreign key cascading']
          }
        ]
      }
    ]
  },
  {
    id: 'roadmap-rust-systems',
    title: 'Rust & Native Desktop Engineering',
    description: 'Learn memory safety, concurrent systems, and native GUI application architecture with Tauri 2.',
    category: 'Systems Programming',
    author: 'LearnUp Curated',
    difficulty: 'advanced',
    estimatedWeeks: 14,
    tags: ['Rust', 'Tauri', 'Systems', 'SQLite'],
    phases: [
      {
        id: 'phase-1-rust-concurrency',
        title: 'Phase 1: Ownership, Borrowing & Threads',
        objective: 'Master borrow checking, lifetimes, Mutex locks, and safe concurrency.',
        order: 1,
        estimatedHours: 45,
        milestones: [
          {
            id: 'm1-rust-ownership',
            phaseId: 'phase-1-rust-concurrency',
            title: 'Memory Safety Without Garbage Collection',
            order: 1,
            learningObjectives: ['Deep dive into stack vs heap', 'Lifetime annotations', 'Smart pointers Arc/Rc'],
            prerequisiteIds: [],
            estimatedHours: 20,
            resources: [
              {
                id: 'res-rust-video',
                type: 'video',
                title: 'Rust Crash Course for TypeScript Developers',
                canonicalUrl: 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA',
                provider: 'YouTube',
                description: 'Comparative guide mapping high-level concepts to Rust primitives.',
                relevantSkill: 'Rust',
                difficulty: 'intermediate',
                durationSeconds: 2400,
                durationFormatted: '40:00'
              }
            ],
            practiceTasks: [
              {
                id: 'task-rust-1',
                title: 'Build multi-threaded worker pool',
                description: 'Write a thread pool in Rust that dispatches jobs over channels.',
                estimatedMinutes: 120,
                deliverable: 'threadpool.rs'
              }
            ],
            completionCriteria: ['Clean compilation with zero unsafe blocks']
          }
        ]
      }
    ]
  }
];
