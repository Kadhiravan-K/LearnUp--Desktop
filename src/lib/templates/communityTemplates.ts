import { CommunityTemplate, TemplateCategory, TemplateDifficulty } from '../types';
import { z } from 'zod';

const CONTRIBUTED_TEMPLATES_KEY = 'LearnUp_contributed_templates';

/**
 * Sanitizes user-authored input to prevent stored XSS or malformed payloads.
 */
export function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export const contributedTemplateSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000),
  category: z.enum(['roadmap', 'playlist', 'focus', 'workflow']),
  author: z.string().trim().max(80).optional().default('Community Contributor'),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default(['Community']),
  estimatedDuration: z.string().trim().max(50).optional().default('10 Hours'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  data: z.record(z.string(), z.any())
});

export const CURATED_TEMPLATES: CommunityTemplate[] = [
  {
    id: 'template_fullstack_devops',
    title: 'Full-Stack Cloud & Distributed Systems Blueprint',
    description: 'Master modern engineering from Next.js server components and WebAssembly to Rust microservices, Kubernetes clusters, and Raft consensus.',
    category: 'roadmap',
    author: 'CloudMasters Collective',
    tags: ['Next.js', 'Rust', 'Kubernetes', 'Distributed Systems'],
    downloadsCount: 2420,
    rating: 4.9,
    previewItemsCount: 12,
    estimatedDuration: '45 Hours',
    difficulty: 'advanced',
    isCurated: true,
    verifiedSource: 'CloudMasters Systems Collective',
    prerequisites: ['TypeScript Fundamentals', 'Basic Operating Systems Concepts'],
    learningOutcomes: [
      'Architect resilient event-driven microservices in Rust & Next.js',
      'Deploy containerized workloads to Kubernetes clusters with GitOps',
      'Implement distributed Raft consensus state machine replication'
    ],
    version: '1.0.0',
    data: {
      type: 'roadmap',
      title: 'Full-Stack Cloud & Distributed Systems',
      description: 'End-to-end curriculum for modern distributed systems.',
      nodes: [
        { node_number: '01', title: 'Modern React 19 & Next.js Architecture', description: 'Server Actions, RSC streaming, and Edge Middleware.', tags: ['React', 'Next.js'] },
        { node_number: '02', title: 'Rust Core Memory Safety & Async Tokio', description: 'Borrow checker, zero-cost abstractions, and concurrency.', tags: ['Rust', 'Async'] },
        { node_number: '03', title: 'gRPC & High-Performance Protobuf Services', description: 'Multiplexed streaming and binary serialization.', tags: ['gRPC', 'Protobuf'] },
        { node_number: '04', title: 'Kubernetes Container Orchestration', description: 'Ingress controllers, daemon sets, and GitOps pipelines.', tags: ['Kubernetes', 'DevOps'] },
        { node_number: '05', title: 'Raft Consensus & Replicated State Machines', description: 'Leader election, log compaction, and split-brain recovery.', tags: ['Raft', 'Distributed'] }
      ]
    }
  },
  {
    id: 'template_karpathy_neural_networks',
    title: 'Andrej Karpathy: Neural Networks Zero to Hero',
    description: 'Complete hands-on deep learning series from Andrej Karpathy building Micrograd, Bigram language models, MLP, BatchNorm, and GPT from scratch.',
    category: 'playlist',
    author: 'Andrej Karpathy',
    tags: ['PyTorch', 'Transformers', 'LLMs', 'GPT', 'Deep Learning'],
    downloadsCount: 8940,
    rating: 5.0,
    previewItemsCount: 8,
    estimatedDuration: '28 Hours',
    difficulty: 'intermediate',
    isCurated: true,
    verifiedSource: 'Andrej Karpathy (YouTube Deep Learning Series)',
    prerequisites: ['Python 3.10+', 'Basic Calculus & Linear Algebra'],
    learningOutcomes: [
      'Build autograd backpropagation engine (Micrograd) from scratch',
      'Train multi-layer perceptrons with batch normalization & residual connections',
      'Implement decoder-only transformer GPT architecture in pure PyTorch'
    ],
    version: '1.0.0',
    data: {
      type: 'playlist',
      title: 'Neural Networks: Zero to Hero',
      description: 'Build GPT from scratch with Andrej Karpathy.',
      sampleVideoUrl: 'https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ'
    }
  },
  {
    id: 'template_3blue1brown_linear_algebra',
    title: '3Blue1Brown: Essence of Linear Algebra & Geometry',
    description: 'Grant Sanderson\'s legendary geometric intuition of vectors, linear transformations, matrix multiplication, determinants, and eigenvalues.',
    category: 'playlist',
    author: '3Blue1Brown (Grant Sanderson)',
    tags: ['Math', 'Linear Algebra', 'Geometry', '3Blue1Brown', 'Visual Math'],
    downloadsCount: 12450,
    rating: 5.0,
    previewItemsCount: 16,
    estimatedDuration: '14 Hours',
    difficulty: 'beginner',
    isCurated: true,
    verifiedSource: '3Blue1Brown (Grant Sanderson)',
    prerequisites: ['High School Geometry & Basic Algebra'],
    learningOutcomes: [
      'Understand linear transformations as coordinate space movements',
      'Geometrically visualize matrix multiplication, determinants, and dot products',
      'Intuitive geometric grasp of eigenvectors and eigenvalues'
    ],
    version: '1.0.0',
    data: {
      type: 'playlist',
      title: 'Essence of Linear Algebra',
      description: 'Geometric intuitions underlying linear algebra.',
      sampleVideoUrl: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab'
    }
  },
  {
    id: 'template_mit_algorithms',
    title: 'MIT 6.006: Introduction to Algorithms & Complexity',
    description: 'Official MIT OpenCourseWare lecture series covering divide-and-conquer, sorting algorithms, balanced BSTs, graph traversals, and dynamic programming.',
    category: 'playlist',
    author: 'MIT OpenCourseWare',
    tags: ['Algorithms', 'Data Structures', 'MIT', 'Computer Science'],
    downloadsCount: 7120,
    rating: 4.95,
    previewItemsCount: 24,
    estimatedDuration: '48 Hours',
    difficulty: 'intermediate',
    isCurated: true,
    verifiedSource: 'MIT OpenCourseWare (Course 6.006)',
    prerequisites: ['Python Programming', 'Discrete Mathematics Basics'],
    learningOutcomes: [
      'Analyze algorithmic asymptotic complexity (Big-O, Omega, Theta)',
      'Implement balanced binary search trees, hash tables, and priority queues',
      'Solve optimization problems using memoization and bottom-up dynamic programming'
    ],
    version: '1.0.0',
    data: {
      type: 'playlist',
      title: 'MIT 6.006 Introduction to Algorithms',
      description: 'Design and analysis of efficient algorithms with MIT faculty.',
      sampleVideoUrl: 'https://www.youtube.com/playlist?list=PLUl4u3cNGP63EdVPNLG3ToM6LaEUuStEY'
    }
  },
  {
    id: 'template_systems_programming',
    title: 'Systems Programming & Embedded Firmware Mastery',
    description: 'Low-level memory management, FreeRTOS kernel scheduling, DMA ring buffers, and ARM Cortex-M hardware peripherals.',
    category: 'roadmap',
    author: 'MIT & Community Systems Lab',
    tags: ['Rust', 'C', 'FreeRTOS', 'ARM Cortex', 'Kernel'],
    downloadsCount: 3850,
    rating: 4.95,
    previewItemsCount: 9,
    estimatedDuration: '60 Hours',
    difficulty: 'advanced',
    isCurated: true,
    verifiedSource: 'MIT & Community Systems Lab',
    prerequisites: ['C Programming', 'Computer Architecture & Memory Hierarchy'],
    learningOutcomes: [
      'Write bare-metal drivers using direct memory-mapped registers',
      'Configure nested vectored interrupt controllers (NVIC) and circular DMA buffers',
      'Port and preemptively schedule multi-threaded FreeRTOS tasks'
    ],
    version: '1.0.0',
    data: {
      type: 'roadmap',
      title: 'Embedded Systems & Firmware Engineering',
      description: 'Low-level bare-metal hardware and kernel internals.',
      nodes: [
        { node_number: '01', title: 'C Memory Layout & Pointer Arithmetic', description: 'Stack, heap, memory stride, and alignment.', tags: ['C', 'Memory'] },
        { node_number: '02', title: 'ARM Assembly & Register Calling Conventions', description: 'Thumb-2 ISA, condition codes, and stack frames.', tags: ['ARM', 'Assembly'] },
        { node_number: '03', title: 'Memory-Mapped I/O & Interrupt Controllers', description: 'NVIC, vector tables, and volatile pointers.', tags: ['Hardware', 'Interrupts'] },
        { node_number: '04', title: 'FreeRTOS Kernel & Task Scheduling', description: 'Context switching, priority inheritance, and mutexes.', tags: ['RTOS', 'Concurrency'] },
        { node_number: '05', title: 'Hardware Root of Trust & Secure Boot', description: 'ECDSA verification and flash encryption.', tags: ['Security', 'Cryptography'] }
      ]
    }
  },
  {
    id: 'template_ultradian_focus',
    title: 'Ultradian 90-Minute Flow State Cadence',
    description: 'Scientifically calibrated 90-minute deep work cycles with 20-minute restorative breaks and 40Hz binaural alpha wave frequency.',
    category: 'focus',
    author: 'NeuroScience Lab',
    tags: ['Flow State', 'Ultradian', '40Hz Binaural', 'Circadian'],
    downloadsCount: 3120,
    rating: 4.9,
    previewItemsCount: 3,
    estimatedDuration: 'Daily Workstation Preset',
    difficulty: 'intermediate',
    isCurated: true,
    verifiedSource: 'Cognitive Neuroscience Workstation Standards',
    prerequisites: ['Quiet Study Environment', 'Stereo Headphones for 40Hz Binaural Beat'],
    learningOutcomes: [
      'Synchronize work blocks to endogenous 90-minute ultradian cognitive rhythms',
      'Prevent dopamine depletion through structured restorative rest cycles',
      'Maintain deep focus flow without mid-task context switching'
    ],
    version: '1.0.0',
    data: {
      type: 'focus',
      title: 'Ultradian 90m Flow State',
      focusMinutes: 90,
      shortBreakMinutes: 20,
      longBreakMinutes: 30,
      soundscape: 'binaural_40hz'
    }
  },
  {
    id: 'template_pomodoro_standard',
    title: 'Classic Pomodoro 25/5 Deep Work Interval',
    description: 'Standard 25-minute sprint with 5-minute restorative micro-breaks, 4-cycle long break, and rain audio soundscape.',
    category: 'focus',
    author: 'LearnUp Ergonomics',
    tags: ['Pomodoro', '25min Sprint', 'Productivity', 'Rain Soundscape'],
    downloadsCount: 5490,
    rating: 4.85,
    previewItemsCount: 4,
    estimatedDuration: 'Standard Cadence',
    difficulty: 'beginner',
    isCurated: true,
    verifiedSource: 'Time Management & Ergonomics Best Practices',
    prerequisites: ['Single Task Objective'],
    learningOutcomes: [
      'Eliminate procrastination via low-friction 25-minute sprints',
      'Establish consistent daily learning rhythm with zero cognitive burnout'
    ],
    version: '1.0.0',
    data: {
      type: 'focus',
      title: 'Classic Pomodoro 25/5',
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      soundscape: 'rain'
    }
  },
  {
    id: 'template_medical_pathology',
    title: 'Medical Biochemistry & Cellular Pathology Pathways',
    description: 'Interactive concept map and lecture series on metabolic regulation, enzymatic kinetics, and clinical pharmacology.',
    category: 'roadmap',
    author: 'Global Health Academy',
    tags: ['Medicine', 'Biochemistry', 'Pathology', 'Pharmacology'],
    downloadsCount: 1950,
    rating: 4.8,
    previewItemsCount: 8,
    estimatedDuration: '50 Hours',
    difficulty: 'intermediate',
    isCurated: true,
    verifiedSource: 'Global Health & Medical Education Academy',
    prerequisites: ['Introductory Biology & Organic Chemistry'],
    learningOutcomes: [
      'Map central metabolic pathways (Glycolysis, TCA cycle, Oxidative Phosphorylation)',
      'Analyze lipid transport lipoproteins and clinical dyslipidemias',
      'Understand cytochrome P450 hepatic drug biotransformation kinetics'
    ],
    version: '1.0.0',
    data: {
      type: 'roadmap',
      title: 'Medical Biochemistry & Cellular Pathways',
      description: 'Metabolism, enzyme kinetics, and pharmacology.',
      nodes: [
        { node_number: '01', title: 'Glycolysis & Krebs Citric Acid Cycle', description: 'ATP generation and allosteric phosphofructokinase regulation.', tags: ['Biochem', 'Glycolysis'] },
        { node_number: '02', title: 'Oxidative Phosphorylation & ATP Synthase', description: 'Electron transport chain complexes I through IV.', tags: ['Mitochondria', 'ATP'] },
        { node_number: '03', title: 'Lipid Metabolism & Lipoprotein Transport', description: 'Chylomicrons, VLDL, LDL, and HDL cholesterol pathways.', tags: ['Lipids', 'Metabolism'] },
        { node_number: '04', title: 'Pharmacokinetics & Cytochrome P450 Enzymes', description: 'Phase I functionalization and Phase II conjugation.', tags: ['Pharmacology', 'CYP450'] }
      ]
    }
  }
];

export const COMMUNITY_TEMPLATES = CURATED_TEMPLATES;

/**
 * Retrieves all templates including user-contributed blueprints.
 */
export function getCommunityTemplates(): CommunityTemplate[] {
  if (typeof window === 'undefined') return CURATED_TEMPLATES;
  try {
    const raw = localStorage.getItem(CONTRIBUTED_TEMPLATES_KEY);
    if (!raw) return CURATED_TEMPLATES;
    const userContributed: CommunityTemplate[] = JSON.parse(raw);
    return [...userContributed, ...CURATED_TEMPLATES];
  } catch {
    return CURATED_TEMPLATES;
  }
}

export type ContributedTemplateInput = Omit<CommunityTemplate, 'id' | 'downloadsCount' | 'rating' | 'previewItemsCount' | 'estimatedDuration'> & {
  previewItemsCount?: number;
  estimatedDuration?: string;
};

/**
 * Saves a new user-contributed template with strict schema validation and sanitization.
 */
export function saveContributedTemplate(template: ContributedTemplateInput): CommunityTemplate {
  const parsed = contributedTemplateSchema.parse({
    title: sanitizeText(template.title),
    description: sanitizeText(template.description),
    category: template.category,
    author: sanitizeText(template.author || 'Community Contributor'),
    tags: (template.tags || []).map(sanitizeText).filter(Boolean),
    estimatedDuration: sanitizeText(template.estimatedDuration || '10 Hours'),
    difficulty: template.difficulty || 'intermediate',
    data: template.data || {}
  });

  const newTemplate: CommunityTemplate = {
    id: `contributed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: parsed.title,
    description: parsed.description,
    category: parsed.category as TemplateCategory,
    author: parsed.author,
    tags: parsed.tags,
    downloadsCount: 0,
    rating: 0,
    previewItemsCount: Array.isArray(parsed.data?.nodes) ? parsed.data.nodes.length : 4,
    estimatedDuration: parsed.estimatedDuration,
    difficulty: parsed.difficulty as TemplateDifficulty,
    isCurated: false,
    version: '1.0.0',
    data: parsed.data
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CONTRIBUTED_TEMPLATES_KEY);
      const existing: CommunityTemplate[] = raw ? JSON.parse(raw) : [];
      const updated = [newTemplate, ...existing];
      localStorage.setItem(CONTRIBUTED_TEMPLATES_KEY, JSON.stringify(updated));
    } catch {}
  }

  return newTemplate;
}

/**
 * Deletes a user-contributed template.
 */
export function deleteContributedTemplate(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CONTRIBUTED_TEMPLATES_KEY);
    if (!raw) return false;
    const existing: CommunityTemplate[] = JSON.parse(raw);
    const updated = existing.filter((t) => t.id !== id);
    localStorage.setItem(CONTRIBUTED_TEMPLATES_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}
