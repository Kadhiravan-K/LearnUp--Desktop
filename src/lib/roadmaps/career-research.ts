import {
  CareerWizardInput,
  CareerRoadmap,
  RoadmapPhase,
  RoadmapMilestone,
  ResourceProvenance,
  PracticeTask,
  MilestoneAssessment,
  MilestoneProject,
  CareerRoadmapSource
} from './career-types';
import { ResourceValidator } from './resource-validator';
import { CompositeCareerResearchService } from './research-providers';
import { rankMilestoneResources } from './resource-ranker';

interface RoleBenchmark {
  standardTitle: string;
  domain: string;
  summary: string;
  authorities: CareerRoadmapSource[];
  isHealthcare?: boolean;
  defaultPhases: {
    title: string;
    objective: string;
    milestones: {
      title: string;
      learningObjectives: string[];
      estimatedHours: number;
      skills: string[];
      resources: {
        type: ResourceProvenance['type'];
        title: string;
        url: string;
        provider: string;
        description: string;
        selectionRationale: string;
      }[];
      practiceTasks: {
        title: string;
        description: string;
        estimatedMinutes: number;
        deliverable: string;
      }[];
      project?: {
        title: string;
        description: string;
        rubric: string[];
      };
      assessment?: {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      };
    }[];
  }[];
}

export const ROLE_BENCHMARKS: Record<string, RoleBenchmark> = {
  'embedded systems engineer': {
    standardTitle: 'Embedded Systems Engineer',
    domain: 'Embedded Engineering',
    summary:
      'Mastery of ARM Cortex-M hardware architectures, FreeRTOS kernel scheduling, register-level peripheral manipulation, and communication protocols (SPI, I2C, UART).',
    authorities: [
      { title: 'Arm Developer Architecture Reference', url: 'https://developer.arm.com', authority: 'Arm Ltd.' },
      { title: 'FreeRTOS Official Kernel Documentation', url: 'https://www.freertos.org', authority: 'Real Time Engineers Ltd.' }
    ],
    defaultPhases: [
      {
        title: 'Phase 1: Bare-Metal Architecture & C Fundamentals',
        objective: 'Master direct register memory-mapped I/O, clock trees, and linker scripts without high-level abstractions.',
        milestones: [
          {
            title: 'ARM Cortex-M Memory Map & Vector Tables',
            learningObjectives: ['Understand memory map regions (Flash, SRAM, Peripherals)', 'Analyze vector table and exception handling mechanisms'],
            estimatedHours: 14,
            skills: ['ARM Cortex-M', 'C', 'Vector Tables'],
            resources: [
              {
                type: 'documentation',
                title: 'Arm Cortex-M4 Generic User Guide',
                url: 'https://developer.arm.com/documentation/dui0553/latest',
                provider: 'Arm Developer',
                description: 'Official processor core architecture manual.',
                selectionRationale: 'Primary documentation from the CPU architecture creator.'
              },
              {
                type: 'video',
                title: 'Microcontroller Bare Metal C Programming Course',
                url: 'https://www.youtube.com/watch?v=0h6C5g8S2hE',
                provider: 'Embedded Systems Academy',
                description: 'Step-by-step register programming from reset vector to main loop.',
                selectionRationale: 'Clear oscilliscope and memory-view demonstrations.'
              }
            ],
            practiceTasks: [
              {
                title: 'Register-level GPIO Toggle',
                description: 'Configure GPIO MODER and BSRR registers in pure C without HAL libraries.',
                estimatedMinutes: 90,
                deliverable: 'C source file with explicit bitwise bitmasks'
              }
            ],
            assessment: {
              question: 'Which register in ARM Cortex-M is dedicated as the Link Register (LR) holding the return address?',
              options: ['R12', 'R14', 'R15', 'R13'],
              correctIndex: 1,
              explanation: 'R14 is the Link Register (LR) which stores the return address for subroutines and exception handlers.'
            }
          },
          {
            title: 'Bus Protocols: SPI, I2C, and UART Drivers',
            learningObjectives: ['Implement multi-byte SPI transactions with hardware chip select', 'Master I2C start/stop conditions and acknowledge bit timing'],
            estimatedHours: 16,
            skills: ['SPI', 'I2C', 'UART', 'Hardware Protocols'],
            resources: [
              {
                type: 'article',
                title: 'I2C Bus Specification and User Manual',
                url: 'https://www.nxp.com/docs/en/user-guide/UM10204.pdf',
                provider: 'NXP Semiconductors',
                description: 'The authoritative standard for I2C communications.',
                selectionRationale: 'Authoritative bus specification defining electrical and timing constraints.'
              }
            ],
            practiceTasks: [
              {
                title: 'Bit-banged SPI Controller Verification',
                description: 'Write a software SPI driver and verify clock phase (CPHA) using logic analyzer traces.',
                estimatedMinutes: 120,
                deliverable: 'Tested driver with logic analyzer timing diagram'
              }
            ]
          }
        ]
      },
      {
        title: 'Phase 2: Real-Time Operating Systems (FreeRTOS)',
        objective: 'Architect preemptive multithreaded firmware with deterministic scheduling, mutexes, and message queues.',
        milestones: [
          {
            title: 'Preemptive Scheduling & Task Synchronization',
            learningObjectives: ['Implement priority-based round-robin task switching', 'Prevent priority inversion using FreeRTOS mutex inheritance'],
            estimatedHours: 18,
            skills: ['FreeRTOS', 'Concurrency', 'RTOS'],
            resources: [
              {
                type: 'documentation',
                title: 'FreeRTOS Kernel Developer Guide',
                url: 'https://www.freertos.org/Documentation/RTOS_book.html',
                provider: 'FreeRTOS Core Team',
                description: 'Complete guide to queues, semaphores, timers, and memory managers.',
                selectionRationale: 'Official RTOS book authored by Richard Barry.'
              }
            ],
            practiceTasks: [
              {
                title: 'Producer-Consumer Sensor Queue',
                description: 'Read an ADC sensor in a high-priority task and dispatch to a telemetry task via thread-safe ring buffer.',
                estimatedMinutes: 120,
                deliverable: 'Source code passing thread sanitizer check'
              }
            ],
            project: {
              title: 'Multi-Sensor IoT Telemetry Node on FreeRTOS',
              description: 'Build a complete firmware image reading temperature and accelerometer, processing via FreeRTOS tasks, and transmitting packets over UART.',
              rubric: ['Zero buffer overflows under load', 'Proper stack depth sizing per task', 'Watchdog timer recovery implemented']
            }
          }
        ]
      }
    ]
  },

  'full-stack software engineer': {
    standardTitle: 'Full-Stack Software Engineer',
    domain: 'Software Engineering',
    summary:
      'End-to-end web systems architecture: React Server Components, Next.js App Router, TypeScript, relational databases (PostgreSQL), REST/gRPC APIs, and distributed consensus.',
    authorities: [
      { title: 'Next.js Official Documentation', url: 'https://nextjs.org/docs', authority: 'Vercel' },
      { title: 'PostgreSQL Global Development Group', url: 'https://www.postgresql.org/docs/', authority: 'PostgreSQL GDG' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', authority: 'Mozilla' }
    ],
    defaultPhases: [
      {
        title: 'Phase 1: Modern Frontend Architecture & Next.js',
        objective: 'Master server-side rendering, streaming, server actions, and accessibility.',
        milestones: [
          {
            title: 'React 19 Server Components & Streaming SSR',
            learningObjectives: ['Separate Server and Client components cleanly', 'Implement suspense boundaries for progressive page loading'],
            estimatedHours: 16,
            skills: ['React', 'Next.js', 'TypeScript'],
            resources: [
              {
                type: 'documentation',
                title: 'React Documentation: Server Components',
                url: 'https://react.dev/reference/rsc/server-components',
                provider: 'React Core Team',
                description: 'Official architectural specifications and mental models for RSC.',
                selectionRationale: 'Direct primary source documentation from React maintainers.'
              }
            ],
            practiceTasks: [
              {
                title: 'Build a Streaming Dashboard with Server Actions',
                description: 'Implement a dashboard that streams slow data queries with fallback skeletons and mutates via Server Actions.',
                estimatedMinutes: 90,
                deliverable: 'Next.js App Router route handler and page component'
              }
            ],
            assessment: {
              question: 'Which directive instructs React to treat a module as the boundary between server-rendered and client-rendered code in Next.js?',
              options: ["'use server'", "'use client'", "'use runtime'", "'use client-boundary'"],
              correctIndex: 1,
              explanation: "'use client' declares the boundary where server execution stops and client bundle hydration begins."
            }
          }
        ]
      },
      {
        title: 'Phase 2: Relational Data Modeling & Distributed Systems',
        objective: 'Design normalized SQL schemas, ACID transactions, database indices, and event-driven architectures.',
        milestones: [
          {
            title: 'PostgreSQL Schema Design, Indexing & ACID Transactions',
            learningObjectives: ['Design 3NF relational schemas with foreign key constraints', 'Optimize queries using EXPLAIN ANALYZE and B-Tree/GIN indices'],
            estimatedHours: 18,
            skills: ['PostgreSQL', 'SQL', 'Data Modeling', 'Transactions'],
            resources: [
              {
                type: 'documentation',
                title: 'PostgreSQL Documentation: Concurrency Control & MVCC',
                url: 'https://www.postgresql.org/docs/current/mvcc.html',
                provider: 'PostgreSQL Global Development Group',
                description: 'Authoritative guide to multi-version concurrency control and isolation levels.',
                selectionRationale: 'Canonical source for database consistency models.'
              }
            ],
            practiceTasks: [
              {
                title: 'Optimize Slow N+1 Queries with EXPLAIN',
                description: 'Analyze an unindexed join query and apply appropriate composite indices to reduce execution cost.',
                estimatedMinutes: 60,
                deliverable: 'SQL migration script and execution plan diff'
              }
            ],
            project: {
              title: 'Multi-Tenant SaaS Learning Management Core',
              description: 'Architect a production-grade backend with row-level security, optimistic locking, idempotent webhook handlers, and background processing.',
              rubric: ['Zero cross-tenant data leakage', 'Transactional rollback on partial failure', 'Sub-50ms p95 query latency on indexed lookups']
            }
          }
        ]
      }
    ]
  },

  'ai/ml engineer': {
    standardTitle: 'AI/ML Engineer',
    domain: 'Data Science',
    summary:
      'From PyTorch tensor computation and autograd to Transformer neural architectures, fine-tuning, retrieval-augmented generation (RAG), and production inference optimization.',
    authorities: [
      { title: 'PyTorch Documentation & Tutorials', url: 'https://pytorch.org/docs/stable/index.html', authority: 'Linux Foundation / PyTorch' },
      { title: 'Andrej Karpathy Neural Networks Series', url: 'https://github.com/karpathy/nn-zero-to-hero', authority: 'Andrej Karpathy' }
    ],
    defaultPhases: [
      {
        title: 'Phase 1: Deep Learning Foundations from Scratch',
        objective: 'Build backpropagation calculus engines, multi-layer perceptrons, and neural components from first principles.',
        milestones: [
          {
            title: 'Autograd & Micrograd: Understanding Gradients',
            learningObjectives: ['Implement scalar backward pass computational graphs', 'Train linear classifiers and multilayer perceptrons'],
            estimatedHours: 16,
            skills: ['Python', 'Calculus', 'Autograd', 'PyTorch'],
            resources: [
              {
                type: 'video',
                title: 'Andrej Karpathy: The spelled-out intro to neural networks and backpropagation',
                url: 'https://www.youtube.com/watch?v=VMj-3S1tku0',
                provider: 'Andrej Karpathy',
                description: 'Building micrograd from scratch in Python.',
                selectionRationale: 'Premier foundational educational series in modern machine learning.'
              }
            ],
            practiceTasks: [
              {
                title: 'Implement Tensor Operations in NumPy',
                description: 'Build matrix multiplication and forward/backward sigmoid pass without using PyTorch autograd.',
                estimatedMinutes: 90,
                deliverable: 'Python script with passing unit tests against analytical derivatives'
              }
            ],
            assessment: {
              question: 'In a computational graph, which mathematical rule determines how gradients propagate backward through composite functions?',
              options: ['Product Rule', 'Chain Rule', 'Quotient Rule', 'L’Hopital’s Rule'],
              correctIndex: 1,
              explanation: 'Backpropagation relies on the Chain Rule of calculus to compute derivatives of composite loss functions.'
            }
          }
        ]
      },
      {
        title: 'Phase 2: Transformer Architectures & LLM Engineering',
        objective: 'Construct self-attention, multi-head attention, decoder-only GPTs, and production evaluation frameworks.',
        milestones: [
          {
            title: 'Scaled Dot-Product & Multi-Head Self-Attention',
            learningObjectives: ['Implement Query-Key-Value attention matrices with causal masking', 'Assemble LayerNorm, feedforward blocks, and positional encodings'],
            estimatedHours: 22,
            skills: ['Transformers', 'PyTorch', 'LLMs', 'Attention'],
            resources: [
              {
                type: 'article',
                title: 'Attention Is All You Need (Vaswani et al.)',
                url: 'https://arxiv.org/abs/1706.03762',
                provider: 'arXiv.org',
                description: 'Foundational research paper introducing the Transformer architecture.',
                selectionRationale: 'Primary seminal research paper for modern generative AI.'
              }
            ],
            practiceTasks: [
              {
                title: 'Train a NanoGPT on Shakespeare Text',
                description: 'Train a small decoder-only transformer and generate conditioned text completions.',
                estimatedMinutes: 150,
                deliverable: 'PyTorch training loop script and loss curves'
              }
            ],
            project: {
              title: 'Vector-Grounded RAG Pipeline with Semantic Reranking',
              description: 'Build an end-to-end question answering pipeline indexing technical PDF documentation with chunking, dense vector retrieval, and cross-encoder reranking.',
              rubric: ['Accurate chunk boundary handling with overlap', 'Faithful answer generation without hallucination', 'Evaluation with RAGAS metrics']
            }
          }
        ]
      }
    ]
  },

  'healthcare education': {
    standardTitle: 'Healthcare Education & Clinical Pathways',
    domain: 'Healthcare Education',
    isHealthcare: true,
    summary:
      'Rigorous academic study of human physiology, cellular biochemistry, enzyme kinetics, and clinical pharmacology for medical students and health researchers.',
    authorities: [
      { title: 'NCBI Bookshelf: Medical Biochemistry', url: 'https://www.ncbi.nlm.nih.gov/books/', authority: 'National Center for Biotechnology Information' }
    ],
    defaultPhases: [
      {
        title: 'Phase 1: Central Metabolic Pathways & Enzyme Kinetics',
        objective: 'Master glycolysis, the citric acid cycle, oxidative phosphorylation, and regulatory allosteric enzymes.',
        milestones: [
          {
            title: 'Cellular Respiration & Chemiosmotic ATP Synthesis',
            learningObjectives: ['Map the 10 enzymatic reactions of glycolysis', 'Analyze electron transport chain complexes I–IV and ATP synthase'],
            estimatedHours: 16,
            skills: ['Biochemistry', 'Metabolism', 'Enzymology'],
            resources: [
              {
                type: 'documentation',
                title: 'NCBI Medical Biochemistry Reference: Glycolysis & TCA Cycle',
                url: 'https://www.ncbi.nlm.nih.gov/books/NBK499878/',
                provider: 'NCBI Bookshelf / StatPearls',
                description: 'Peer-reviewed academic curriculum on carbohydrate metabolism.',
                selectionRationale: 'Authoritative government and peer-reviewed educational textbook resource.'
              }
            ],
            practiceTasks: [
              {
                title: 'Metabolic Pathway Flowchart Creation',
                description: 'Diagram the rate-limiting steps of glycolysis and gluconeogenesis, noting reciprocal regulation by F2,6-BP.',
                estimatedMinutes: 90,
                deliverable: 'Hand-drawn or Mermaid diagram mapping regulatory nodes'
              }
            ],
            assessment: {
              question: 'Which enzyme serves as the primary rate-limiting and committed step of glycolysis?',
              options: ['Hexokinase', 'Phosphofructokinase-1 (PFK-1)', 'Pyruvate Kinase', 'Aldolase'],
              correctIndex: 1,
              explanation: 'Phosphofructokinase-1 (PFK-1) is the major regulatory flux-controlling step in glycolysis.'
            }
          }
        ]
      }
    ]
  }
};

/**
 * Normalizes input role names to standard benchmarks or creates a synthesized technical blueprint.
 */
export function resolveRoleBenchmark(role: string): RoleBenchmark {
  const normalized = role.trim().toLowerCase();

  for (const [key, benchmark] of Object.entries(ROLE_BENCHMARKS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return benchmark;
    }
  }

  // Generalized fallback for specialized engineering, leadership, or product roles
  return {
    standardTitle: role.trim(),
    domain: 'Engineering & Innovation',
    summary: `Comprehensive professional curriculum for ${role.trim()} focusing on industry standards, architectural tradeoffs, and hands-on deliverables.`,
    authorities: [
      { title: 'Official Standards & Documentation Portal', url: 'https://developer.mozilla.org', authority: 'Technical Standards Organization' }
    ],
    defaultPhases: [
      {
        title: `Phase 1: ${role.trim()} Core Competencies & Foundations`,
        objective: `Build rigorous prerequisite knowledge, architectural models, and production workflows for ${role.trim()}.`,
        milestones: [
          {
            title: `${role.trim()} Architecture & Principles`,
            learningObjectives: [`Master primary methodologies and tools used by modern ${role.trim()} practitioners`, 'Evaluate tradeoffs between standard architectural patterns'],
            estimatedHours: 14,
            skills: [role.trim(), 'Architecture', 'Core Workflow'],
            resources: [
              {
                type: 'documentation',
                title: `${role.trim()} Technical Guide & Best Practices`,
                url: 'https://developer.mozilla.org',
                provider: 'Technical Documentation',
                description: `Standard competencies and specifications for ${role.trim()}.`,
                selectionRationale: 'Recognized industry standard reference.'
              }
            ],
            practiceTasks: [
              {
                title: `Foundational ${role.trim()} Implementation Exercise`,
                description: `Apply core patterns to build a functional prototype addressing realistic constraints.`,
                estimatedMinutes: 90,
                deliverable: 'Documented technical prototype or specification'
              }
            ],
            assessment: {
              question: `What is the primary factor when choosing between competing architectural patterns in ${role.trim()}?`,
              options: ['Scalability, maintainability, and domain constraints', 'Arbitrary tool popularity', 'Maximum code complexity', 'Zero test coverage'],
              correctIndex: 0,
              explanation: 'Engineering decisions balance scalability, maintainability, and explicit domain constraints.'
            }
          }
        ]
      },
      {
        title: `Phase 2: Advanced Production Mastery for ${role.trim()}`,
        objective: `Tackle complex scenarios, performance optimization, and cross-functional leadership in ${role.trim()}.`,
        milestones: [
          {
            title: `High-Impact Systems & Strategy for ${role.trim()}`,
            learningObjectives: ['Lead strategic implementations under real-world constraints', 'Measure outcomes using verifiable quality metrics'],
            estimatedHours: 16,
            skills: [role.trim(), 'Strategy', 'Optimization'],
            resources: [
              {
                type: 'article',
                title: `Engineering Tradeoffs and Best Practices in ${role.trim()}`,
                url: 'https://developer.mozilla.org',
                provider: 'Industry Journal',
                description: 'Deep dive into production case studies.',
                selectionRationale: 'Grounded in production lessons and battle-tested patterns.'
              }
            ],
            practiceTasks: [
              {
                title: 'Comprehensive Capstone Case Study',
                description: 'Design and deliver an end-to-end capstone solving a high-priority problem in this domain.',
                estimatedMinutes: 180,
                deliverable: 'Complete project repository and documentation'
              }
            ],
            project: {
              title: `${role.trim()} Capstone Portfolio Project`,
              description: `A production-ready artifact demonstrating complete mastery of ${role.trim()} principles.`,
              rubric: ['Solves real user problem', 'Adheres to industry standards', 'Includes clear documentation and test coverage']
            }
          }
        ]
      }
    ]
  };
}

/**
 * Executes the server-controlled Research-First pipeline (STEPS A through F).
 */
export async function executeCareerResearchPipeline(
  input: CareerWizardInput,
  validator?: ResourceValidator,
  researchService?: CompositeCareerResearchService
): Promise<CareerRoadmap> {
  const resourceValidator = validator || new ResourceValidator();
  const service = researchService || new CompositeCareerResearchService();
  const researchPlan = await service.research(input);

  // STEP A & B: Skill Gap Analysis based on user input
  const userKnownSkills = new Set(input.existingSkills.map((s) => s.toLowerCase().trim()));
  const userSkipSkills = new Set(input.skipSkills.map((s) => s.toLowerCase().trim()));
  const userStrengthenSkills = new Set(input.strengthenSkills.map((s) => s.toLowerCase().trim()));

  const validatedPhases: RoadmapPhase[] = [];
  let globalOrder = 1;
  let totalEstimatedHours = 0;

  // STEP C, D, & E: Skill Graph Building, Resource Validation & Ranking
  for (let pIdx = 0; pIdx < researchPlan.phases.length; pIdx++) {
    const defaultPhase = researchPlan.phases[pIdx];
    const validatedMilestones: RoadmapMilestone[] = [];
    let phaseHours = 0;

    for (let mIdx = 0; mIdx < defaultPhase.milestones.length; mIdx++) {
      const defaultM = defaultPhase.milestones[mIdx];

      // Check if user already mastered all skills for this milestone and didn't mark to strengthen
      const isKnown = defaultM.skills.every((s) => userKnownSkills.has(s.toLowerCase()));
      const isSkipped = defaultM.skills.some((s) => userSkipSkills.has(s.toLowerCase()));
      const isStrengthened = defaultM.skills.some((s) => userStrengthenSkills.has(s.toLowerCase()));

      if (isSkipped) {
        continue; // User explicitly excluded this skill
      }

      // If user knows it and didn't request to strengthen, adjust hours downwards
      const adjustedHours = isKnown && !isStrengthened ? Math.max(2, Math.round(defaultM.estimatedHours * 0.3)) : defaultM.estimatedHours;

      // Validate resources asynchronously using ResourceValidator
      const validatedResources: ResourceProvenance[] = [];
      for (const res of defaultM.resources) {
        if (res.type === 'video' && res.url.includes('youtube.com')) {
          const verified = await resourceValidator.validateYouTubeVideo(res.url, {
            title: res.title,
            provider: res.provider,
            description: res.description,
            relevantSkill: defaultM.skills[0] || 'Core Skill',
            difficulty: input.experienceLevel,
            selectionRationale: res.selectionRationale
          });
          validatedResources.push(verified);
        } else {
          const verified = await resourceValidator.validateWebResource(res.url, res.type, {
            title: res.title,
            provider: res.provider,
            description: res.description,
            relevantSkill: defaultM.skills[0] || 'Core Skill',
            difficulty: input.experienceLevel,
            selectionRationale: res.selectionRationale
          });
          validatedResources.push(verified);
        }
      }

      // Rank validated resources based on relevance, credibility, difficulty and format
      const rankedResources = rankMilestoneResources(validatedResources, {
        targetRole: researchPlan.standardTitle,
        milestoneTitle: defaultM.title,
        learningObjectives: defaultM.learningObjectives,
        experienceLevel: input.experienceLevel,
        preferredLanguage: input.preferredLanguage,
        preferredFormats: input.preferredFormats
      });

      const milestoneId = `m-${pIdx + 1}-${mIdx + 1}`;
      validatedMilestones.push({
        id: milestoneId,
        phaseId: `phase-${pIdx + 1}`,
        title: isKnown && !isStrengthened ? `${defaultM.title} (Review & Refresh)` : defaultM.title,
        order: globalOrder++,
        learningObjectives: defaultM.learningObjectives,
        prerequisiteIds: globalOrder > 2 ? [`m-${pIdx + 1}-${mIdx}`] : [],
        estimatedHours: adjustedHours,
        resources: rankedResources,
        practiceTasks: defaultM.practiceTasks.map((t, idx) => ({
          id: `task-${pIdx + 1}-${mIdx + 1}-${idx + 1}`,
          title: t.title,
          description: t.description,
          estimatedMinutes: t.estimatedMinutes,
          deliverable: t.deliverable
        })),
        project: defaultM.project
          ? {
              id: `proj-${pIdx + 1}-${mIdx + 1}`,
              title: defaultM.project.title,
              description: defaultM.project.description,
              rubric: defaultM.project.rubric
            }
          : undefined,
        assessment: defaultM.assessment
          ? {
              id: `quiz-${pIdx + 1}-${mIdx + 1}`,
              question: defaultM.assessment.question,
              options: defaultM.assessment.options,
              correctIndex: defaultM.assessment.correctIndex,
              explanation: defaultM.assessment.explanation
            }
          : undefined,
        completionCriteria: [
          'All practice deliverables verified',
          'Interactive checkpoint quiz scored >= 80%',
          'Production code pass without compiler or linter errors'
        ]
      });

      phaseHours += adjustedHours;
    }

    if (validatedMilestones.length > 0) {
      validatedPhases.push({
        id: `phase-${pIdx + 1}`,
        title: defaultPhase.title,
        objective: defaultPhase.objective,
        order: pIdx + 1,
        estimatedHours: phaseHours,
        milestones: validatedMilestones
      });
      totalEstimatedHours += phaseHours;
    }
  }

  // Calculate actual timeline weeks based on weekly study hours
  const calculatedWeeks = Math.max(2, Math.ceil(totalEstimatedHours / Math.max(1, input.weeklyHours)));

  // Build Mermaid diagram and mindmap representations
  const mermaidDiagram = generateMermaidFlowchart(researchPlan.standardTitle, validatedPhases);
  const mermaidMindmap = generateMermaidMindmap(researchPlan.standardTitle, validatedPhases);

  // Skill gap summary
  const skillGapSummary = `Analyzed competencies for ${researchPlan.standardTitle} (${input.experienceLevel.toUpperCase()} level). ` +
    (input.existingSkills.length > 0
      ? `Recognized existing skills: ${input.existingSkills.join(', ')}. `
      : 'Starting from foundational principles. ') +
    (input.strengthenSkills.length > 0
      ? `Deepened focus allocated to: ${input.strengthenSkills.join(', ')}. `
      : '') +
    `Curriculum structured into ${validatedPhases.length} sequential phases with ~${totalEstimatedHours} hours of verified learning material.`;

  return {
    id: `crm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: `${researchPlan.standardTitle}: Production Learning Trajectory`,
    targetRole: researchPlan.standardTitle,
    experienceLevel: input.experienceLevel,
    learningGoal: input.learningGoal,
    weeklyHours: input.weeklyHours,
    estimatedWeeks: calculatedWeeks,
    existingSkills: input.existingSkills,
    strengthenSkills: input.strengthenSkills,
    skipSkills: input.skipSkills,
    preferredLanguage: input.preferredLanguage,
    preferredFormats: input.preferredFormats,
    targetMarket: input.targetMarket,
    jobDescriptionSnippet: input.jobDescriptionText ? input.jobDescriptionText.substring(0, 500) : undefined,
    skillGapSummary,
    phases: validatedPhases,
    sources: researchPlan.authorities,
    generatedAt: new Date().toISOString(),
    generationStatus: 'ready',
    medicalDisclaimer: researchPlan.isHealthcare
      ? 'Notice: Generated strictly for academic and continuing educational study. Does not constitute clinical advice or licensed healthcare practice.'
      : undefined,
    mermaidDiagram: input.isRichUiEnabled ? mermaidDiagram : undefined,
    mermaidMindmap: input.isRichUiEnabled ? mermaidMindmap : undefined,
    researchProvider: researchPlan.researchProvider,
    isLiveResearched: researchPlan.isLiveResearched,
    provenanceNote: researchPlan.provenanceNote,
    retrievalTimestamp: researchPlan.retrievalTimestamp,
    researchConfidence: researchPlan.researchConfidence
  };
}

/**
 * Generates valid Mermaid flowchart syntax for the phases and milestones.
 */
function generateMermaidFlowchart(roleTitle: string, phases: RoadmapPhase[]): string {
  const lines: string[] = ['flowchart TD'];
  lines.push(`  Start(["🎯 Start: ${roleTitle}"]) --> Phase1`);

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const phaseKey = `Phase${i + 1}`;
    lines.push(`  subgraph ${phaseKey} ["${phase.title}"]`);

    for (let j = 0; j < phase.milestones.length; j++) {
      const m = phase.milestones[j];
      const mNode = `m_${i + 1}_${j + 1}`;
      lines.push(`    ${mNode}["${m.title} (~${m.estimatedHours}h)"]`);
      if (j > 0) {
        const prevNode = `m_${i + 1}_${j}`;
        lines.push(`    ${prevNode} --> ${mNode}`);
      }
    }
    lines.push('  end');

    if (i < phases.length - 1) {
      const currentLastNode = `m_${i + 1}_${phase.milestones.length}`;
      const nextFirstNode = `m_${i + 2}_1`;
      lines.push(`  ${currentLastNode} ==> ${nextFirstNode}`);
    }
  }

  const lastPhase = phases[phases.length - 1];
  if (lastPhase && lastPhase.milestones.length > 0) {
    const finalNode = `m_${phases.length}_${lastPhase.milestones.length}`;
    lines.push(`  ${finalNode} --> Target(["🏆 Job-Ready: ${roleTitle}"])`);
  }

  return lines.join('\n');
}

/**
 * Generates valid Mermaid mindmap syntax for the role competencies.
 */
function generateMermaidMindmap(roleTitle: string, phases: RoadmapPhase[]): string {
  const lines: string[] = ['mindmap'];
  lines.push(`  root(("${roleTitle}"))`);

  for (const phase of phases) {
    lines.push(`    ["${phase.title}"]`);
    for (const m of phase.milestones) {
      lines.push(`      ("${m.title}")`);
    }
  }

  return lines.join('\n');
}
