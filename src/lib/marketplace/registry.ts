import {
  MarketplaceItem,
  MarketplaceFilterState,
  MarketplaceCategoryTab,
  MarketplaceDomain
} from './types';
import { CURATED_TEMPLATES } from '../templates/communityTemplates';
import { CORE_PLUGINS } from '../plugins/registry';
import { AVAILABLE_CONNECTORS } from '../connectors';

const INSTALLED_ITEMS_STORAGE_KEY = 'LearnUp_installed_marketplace_items';

export const UNIFIED_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // =========================================================================
  // 1. PROFESSIONAL FEATURE PACKS
  // =========================================================================
  {
    id: 'pack_mock_interview',
    kind: 'feature_pack',
    title: 'AI Mock Interview Coach Suite',
    description:
      'Comprehensive role-based interview preparation for Frontend, Backend, System Design, and Behavioral rounds with structured feedback rubrics and progress history.',
    domain: 'HR & Recruitment',
    version: '1.2.0',
    publisher: 'LearnUp Studio',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.9,
    reviewCount: 310,
    installCount: 1420,
    tags: ['Interview', 'Mock Interview', 'Behavioral', 'System Design', 'HR'],
    difficulty: 'intermediate',
    includedAgents: ['agent_mock_interview', 'agent_system_design_coach'],
    includedSkills: ['skill_resume_reviewer'],
    pricing: 'free',
    updatedAt: '2026-10-10'
  },
  {
    id: 'pack_resume_builder',
    kind: 'feature_pack',
    title: 'ATS Resume Builder & Career Reviewer',
    description:
      'Structured markdown resume editor with real-time job description gap analysis, action-verb suggestions, and clean export formatting. No fabricated qualifications.',
    domain: 'HR & Recruitment',
    version: '1.1.0',
    publisher: 'LearnUp Studio',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.8,
    reviewCount: 195,
    installCount: 890,
    tags: ['Resume', 'Career', 'ATS', 'Reviewer', 'Export'],
    difficulty: 'beginner',
    includedSkills: ['skill_resume_reviewer'],
    pricing: 'free',
    updatedAt: '2026-10-08'
  },
  {
    id: 'pack_systems_engineering',
    kind: 'feature_pack',
    title: 'Cloud & Distributed Systems Engineering Pack',
    description:
      'Production engineering curricula covering Next.js, Rust microservices, Kubernetes clusters, and Raft consensus with live architectural diagrams.',
    domain: 'Software Engineering',
    version: '2.0.0',
    publisher: 'CloudMasters Collective',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: false,
    rating: 4.95,
    reviewCount: 520,
    installCount: 3400,
    tags: ['Distributed Systems', 'Rust', 'Kubernetes', 'Cloud', 'Raft'],
    difficulty: 'advanced',
    includedAgents: ['agent_coding_mentor'],
    includedSkills: ['skill_mermaid_mindmap', 'skill_roadmap_generator'],
    pricing: 'free',
    updatedAt: '2026-10-12'
  },
  {
    id: 'pack_embedded_iot',
    kind: 'feature_pack',
    title: 'Embedded Firmware & Bare-Metal IoT Suite',
    description:
      'Hands-on embedded systems mastery for ARM Cortex-M, FreeRTOS kernel scheduling, SPI/I2C communication protocols, and low-power hardware timers.',
    domain: 'Embedded Engineering',
    version: '1.0.0',
    publisher: 'Embedded Guild',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: false,
    isInstalled: false,
    rating: 4.85,
    reviewCount: 140,
    installCount: 680,
    tags: ['Embedded', 'FreeRTOS', 'ARM', 'Firmware', 'C/C++'],
    difficulty: 'advanced',
    pricing: 'free',
    updatedAt: '2026-10-01'
  },
  {
    id: 'pack_design_engineering',
    kind: 'feature_pack',
    title: 'Design Systems & Interface Engineering Pack',
    description:
      'Bridging Figma semantic design tokens, WCAG AAA accessibility, component libraries, and interactive micro-animations in React 19.',
    domain: 'Design Engineering',
    version: '1.3.0',
    publisher: 'Interface Guild',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: false,
    isInstalled: false,
    rating: 4.9,
    reviewCount: 230,
    installCount: 1100,
    tags: ['Design Systems', 'Figma', 'Accessibility', 'Tokens', 'UI'],
    difficulty: 'intermediate',
    pricing: 'free',
    updatedAt: '2026-10-05'
  },
  {
    id: 'pack_data_science',
    kind: 'feature_pack',
    title: 'Deep Learning & Transformer Architecture Suite',
    description:
      'From Micrograd autograd calculus to decoder-only Transformer GPT architectures in PyTorch with Andrej Karpathy curriculum integration.',
    domain: 'Data Science',
    version: '2.1.0',
    publisher: 'AI Research Lab',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 5.0,
    reviewCount: 780,
    installCount: 5200,
    tags: ['Deep Learning', 'PyTorch', 'Transformers', 'LLM', 'GPT'],
    difficulty: 'advanced',
    includedSkills: ['skill_mermaid_mindmap', 'skill_quiz_flashcard'],
    pricing: 'free',
    updatedAt: '2026-10-14'
  },
  {
    id: 'pack_healthcare_education',
    kind: 'feature_pack',
    title: 'Medical Biochemistry & Cellular Pathways',
    description:
      'Curriculum on central metabolic pathways, enzyme kinetics, and cytochrome P450 pharmacokinetics designed strictly for academic study and educational purposes. Not medical advice.',
    domain: 'Healthcare Education',
    version: '1.0.0',
    publisher: 'Global Health Academy',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: false,
    isInstalled: false,
    rating: 4.75,
    reviewCount: 95,
    installCount: 410,
    tags: ['Biochemistry', 'Metabolism', 'Enzymes', 'Medicine', 'Education'],
    difficulty: 'intermediate',
    pricing: 'free',
    medicalDisclaimer:
      'Notice: Educational material for academic study only. Does not provide medical diagnostic authority or clinical treatment advice.',
    updatedAt: '2026-09-28'
  },
  {
    id: 'pack_leadership_executive',
    kind: 'feature_pack',
    title: 'Executive Leadership & Strategic OKRs Suite',
    description:
      'Actionable frameworks for technology executives: strategy alignment, quarterly OKR execution, board communications, and organizational scaling.',
    domain: 'Leadership / CEO',
    version: '1.1.0',
    publisher: 'Executive Growth Forum',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: false,
    rating: 4.9,
    reviewCount: 165,
    installCount: 740,
    tags: ['Leadership', 'Executive', 'OKRs', 'Strategy', 'Management'],
    difficulty: 'advanced',
    pricing: 'free',
    updatedAt: '2026-10-09'
  },
  {
    id: 'pack_seo_growth',
    kind: 'feature_pack',
    title: 'Technical SEO & Programmatic Growth Pack',
    description:
      'Search architecture, Core Web Vitals optimization, programmatic landing pages, and structured JSON-LD schema engineering.',
    domain: 'SEO & Marketing',
    version: '1.2.0',
    publisher: 'Growth Engine Lab',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: false,
    isInstalled: false,
    rating: 4.82,
    reviewCount: 110,
    installCount: 620,
    tags: ['SEO', 'Growth', 'Core Web Vitals', 'Marketing', 'JSON-LD'],
    difficulty: 'intermediate',
    pricing: 'free',
    updatedAt: '2026-10-06'
  },

  // =========================================================================
  // 2. AGENTS
  // =========================================================================
  {
    id: 'agent_mock_interview',
    kind: 'agent',
    title: 'AI Mock Interview Coach',
    description:
      'Conducts interactive, timed interview sessions with progressive questions, answer evaluation, rubric scoring, and structured feedback.',
    domain: 'HR & Recruitment',
    version: '1.2.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.9,
    reviewCount: 220,
    installCount: 1600,
    tags: ['Interview', 'Coach', 'Agent', 'Career'],
    difficulty: 'intermediate',
    permissions: ['read_profile', 'save_interview_history'],
    pricing: 'free',
    updatedAt: '2026-10-10'
  },
  {
    id: 'agent_coding_mentor',
    kind: 'agent',
    title: 'Socratic Coding Mentor',
    description:
      'Guides learners through debugging, architectural tradeoffs, and algorithms using Socratic questioning rather than writing raw code for them.',
    domain: 'Software Engineering',
    version: '1.4.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.88,
    reviewCount: 340,
    installCount: 2100,
    tags: ['Mentor', 'Coding', 'Algorithms', 'Socratic'],
    difficulty: 'intermediate',
    permissions: ['read_notes', 'read_course_context'],
    pricing: 'free',
    updatedAt: '2026-10-07'
  },
  {
    id: 'agent_system_design_coach',
    kind: 'agent',
    title: 'Distributed System Design Coach',
    description:
      'Walks through large-scale system architectures (caching, sharding, consensus, rate limiters) with Mermaid diagram generation.',
    domain: 'Software Engineering',
    version: '1.1.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: false,
    rating: 4.92,
    reviewCount: 180,
    installCount: 950,
    tags: ['System Design', 'Architecture', 'Distributed', 'Scale'],
    difficulty: 'advanced',
    permissions: ['render_mermaid'],
    pricing: 'free',
    updatedAt: '2026-10-04'
  },

  // =========================================================================
  // 3. SKILLS
  // =========================================================================
  {
    id: 'skill_resume_reviewer',
    kind: 'skill',
    title: 'ATS Resume Reviewer & Keyword Optimizer',
    description:
      'Evaluates resume markdown against target job descriptions, checking for impact verbs, quantifiable metrics, and formatting issues.',
    domain: 'HR & Recruitment',
    version: '1.1.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.85,
    reviewCount: 130,
    installCount: 1200,
    tags: ['Resume', 'ATS', 'Reviewer', 'Skill'],
    difficulty: 'beginner',
    pricing: 'free',
    updatedAt: '2026-10-09'
  },
  {
    id: 'skill_quiz_flashcard',
    kind: 'skill',
    title: 'Quiz & Leitner Flashcard Generator',
    description:
      'Transforms video notes and lecture transcripts into structured multiple-choice questions and spaced-repetition flashcard decks.',
    domain: 'Education',
    version: '2.0.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.94,
    reviewCount: 410,
    installCount: 2900,
    tags: ['Quiz', 'Flashcard', 'Leitner', 'Active Recall'],
    difficulty: 'beginner',
    pricing: 'free',
    updatedAt: '2026-10-12'
  },
  {
    id: 'skill_mermaid_mindmap',
    kind: 'skill',
    title: 'Mermaid Mind Map & Flowchart Synthesizer',
    description:
      'Converts study notes and conceptual hierarchies into live, interactive Mermaid diagrams (flowcharts, mind maps, sequence diagrams).',
    domain: 'Education',
    version: '1.5.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.9,
    reviewCount: 360,
    installCount: 2500,
    tags: ['Mermaid', 'Mindmap', 'Flowchart', 'Diagram'],
    difficulty: 'intermediate',
    pricing: 'free',
    updatedAt: '2026-10-11'
  },
  {
    id: 'skill_roadmap_generator',
    kind: 'skill',
    title: 'Curriculum & Milestone Roadmap Synthesizer',
    description:
      'Breaks down ambitious technical learning goals into sequenced weekly modules, prerequisite checks, and verifiable outcomes.',
    domain: 'Education',
    version: '1.3.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: false,
    rating: 4.8,
    reviewCount: 150,
    installCount: 1100,
    tags: ['Roadmap', 'Milestones', 'Curriculum', 'Study'],
    difficulty: 'intermediate',
    pricing: 'free',
    updatedAt: '2026-10-06'
  },
  {
    id: 'skill_career_roadmap_builder',
    kind: 'skill',
    title: 'AI Career Roadmap Builder & Research Engine',
    description:
      'Generates research-grounded career learning roadmaps from target professions with verified educational resources, skill-gap analysis, and interactive Mermaid diagrams.',
    domain: 'Software Engineering',
    version: '2.0.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: true,
    isInstalled: true,
    rating: 4.96,
    reviewCount: 420,
    installCount: 3100,
    tags: ['Career', 'Roadmap', 'Research', 'AI', 'Competency', 'Verified', 'Builder'],
    difficulty: 'intermediate',
    pricing: 'free',
    updatedAt: '2026-10-15'
  },
  {
    id: 'skill_study_planner',
    kind: 'skill',
    title: 'Adaptive Pomodoro & Spaced Review Planner',
    description:
      'Schedules balanced focus blocks, rest intervals, and spaced repetition milestones based on current retention decay rates.',
    domain: 'Education',
    version: '1.2.0',
    publisher: 'LearnUp Core',
    isVerifiedPublisher: true,
    isCurated: true,
    isAiPowered: false,
    isInstalled: true,
    rating: 4.75,
    reviewCount: 88,
    installCount: 850,
    tags: ['Planner', 'Pomodoro', 'Spaced Repetition', 'Time'],
    difficulty: 'beginner',
    pricing: 'free',
    updatedAt: '2026-09-30'
  },

  // =========================================================================
  // 4. TEMPLATES (Imported from curated community catalog)
  // =========================================================================
  ...CURATED_TEMPLATES.map(
    (tpl): MarketplaceItem => ({
      id: tpl.id,
      kind: 'template',
      title: tpl.title,
      description: tpl.description,
      domain:
        tpl.category === 'roadmap'
          ? 'Software Engineering'
          : tpl.category === 'playlist'
          ? 'Data Science'
          : 'Education',
      version: tpl.version || '1.0.0',
      publisher: tpl.author,
      isVerifiedPublisher: !!tpl.verifiedSource,
      isCurated: !!tpl.isCurated,
      isAiPowered: false,
      isInstalled: false,
      rating: tpl.rating || 4.8,
      reviewCount: Math.floor((tpl.downloadsCount || 100) / 10),
      installCount: tpl.downloadsCount || 0,
      tags: tpl.tags || [],
      difficulty: tpl.difficulty || 'intermediate',
      pricing: 'free',
      updatedAt: '2026-10-01',
      data: tpl.data
    })
  ),

  // =========================================================================
  // 5. PLUGINS (From Core Plugin Registry)
  // =========================================================================
  ...CORE_PLUGINS.map(
    (plg): MarketplaceItem => ({
      id: `plugin_${plg.id}`,
      kind: 'plugin',
      title: plg.name,
      description: plg.description,
      domain:
        plg.category === 'coding_vibe'
          ? 'Software Engineering'
          : plg.category === 'learning_science'
          ? 'Education'
          : 'Software Engineering',
      version: plg.version,
      publisher: plg.author,
      isVerifiedPublisher: true,
      isCurated: true,
      isAiPowered: plg.category === 'ai_skills' || plg.id.includes('vibe') || plg.id.includes('ai'),
      isInstalled: plg.isDefaultEnabled,
      rating: 4.9,
      reviewCount: 160,
      installCount: 1800,
      tags: plg.capabilities || ['plugin'],
      pricing: 'free',
      updatedAt: '2026-10-10'
    })
  ),

  // =========================================================================
  // 6. CONNECTORS (From Available Connectors Catalog)
  // =========================================================================
  ...AVAILABLE_CONNECTORS.map(
    (conn): MarketplaceItem => ({
      id: `connector_${conn.type}`,
      kind: 'connector',
      title: conn.name,
      description: conn.description,
      domain:
        conn.category === 'Developer'
          ? 'Software Engineering'
          : 'Education',
      version: '1.0.0',
      publisher: 'LearnUp Official',
      isVerifiedPublisher: true,
      isCurated: true,
      isAiPowered: false,
      isInstalled: conn.defaultEnabled,
      rating: 4.85,
      reviewCount: 90,
      installCount: 950,
      tags: [conn.category, 'Connector', 'Sync'],
      pricing: 'free',
      updatedAt: '2026-09-20'
    })
  )
];

/**
 * Retrieves the list of installed marketplace item IDs from localStorage
 */
export function getInstalledMarketplaceItemIds(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(
      UNIFIED_MARKETPLACE_ITEMS.filter((i) => i.isInstalled).map((i) => i.id)
    );
  }
  try {
    const raw = localStorage.getItem(INSTALLED_ITEMS_STORAGE_KEY);
    if (!raw) {
      const defaultInstalled = UNIFIED_MARKETPLACE_ITEMS.filter((i) => i.isInstalled).map((i) => i.id);
      localStorage.setItem(INSTALLED_ITEMS_STORAGE_KEY, JSON.stringify(defaultInstalled));
      return new Set(defaultInstalled);
    }
    return new Set(JSON.parse(raw));
  } catch {
    return new Set(UNIFIED_MARKETPLACE_ITEMS.filter((i) => i.isInstalled).map((i) => i.id));
  }
}

/**
 * Toggles the installation status of a marketplace item
 */
export function toggleInstallMarketplaceItem(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const installedSet = getInstalledMarketplaceItemIds();
  const isCurrentlyInstalled = installedSet.has(id);

  if (isCurrentlyInstalled) {
    installedSet.delete(id);
  } else {
    installedSet.add(id);
  }

  try {
    localStorage.setItem(
      INSTALLED_ITEMS_STORAGE_KEY,
      JSON.stringify(Array.from(installedSet))
    );
    window.dispatchEvent(
      new CustomEvent('LearnUp_marketplace_installed_changed', {
        detail: { id, isInstalled: !isCurrentlyInstalled }
      })
    );
  } catch {}

  return !isCurrentlyInstalled;
}

export const toggleMarketplaceItemInstall = toggleInstallMarketplaceItem;

/**
 * Filters and sorts marketplace items using verified category, search, and criteria.
 */
export function filterMarketplaceItems(
  items: MarketplaceItem[],
  filters: MarketplaceFilterState,
  userEnrolledDomains: MarketplaceDomain[] = []
): MarketplaceItem[] {
  const installedSet = getInstalledMarketplaceItemIds();

  return items
    .filter((item) => {
      const isItemInstalled = installedSet.has(item.id);

      // 1. Category Tab Filter
      if (filters.categoryTab === 'for_you') {
        // Transparent personalization: If user has enrolled domains, match them.
        // Otherwise provide curated essentials without fabricating scores.
        if (userEnrolledDomains.length > 0) {
          const matchesUserDomain = userEnrolledDomains.includes(item.domain);
          if (!matchesUserDomain && !item.isCurated) return false;
        } else {
          // Transparent fallback: Curated essentials & popular starters
          if (!item.isCurated && item.installCount < 1000) return false;
        }
      } else if (filters.categoryTab === 'templates') {
        if (item.kind !== 'template') return false;
      } else if (filters.categoryTab === 'agents') {
        if (item.kind !== 'agent') return false;
      } else if (filters.categoryTab === 'skills') {
        if (item.kind !== 'skill') return false;
      } else if (filters.categoryTab === 'plugins') {
        if (item.kind !== 'plugin' && item.kind !== 'feature_pack') return false;
      } else if (filters.categoryTab === 'connectors') {
        if (item.kind !== 'connector') return false;
      }
      // 'discover' shows all kinds

      // 2. Domain Filter
      if (filters.domain !== 'all' && item.domain !== filters.domain) {
        return false;
      }

      // 3. Difficulty Filter
      if (filters.difficulty !== 'all' && item.difficulty !== filters.difficulty) {
        return false;
      }

      // 4. AI-Powered Only Filter
      if (filters.aiOnly && !item.isAiPowered) {
        return false;
      }

      // 5. Installed Only Filter
      if (filters.installedOnly && !isItemInstalled) {
        return false;
      }

      // 6. Verified Only Filter
      if (filters.verifiedOnly && !item.isVerifiedPublisher) {
        return false;
      }

      // 7. Search Query Filter (Title, Description, Tags, Publisher)
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchPub = item.publisher.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTags && !matchPub) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sorting implementation
      if (filters.sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      if (filters.sortBy === 'highest_rated') {
        return b.rating - a.rating;
      }
      if (filters.sortBy === 'most_installed') {
        return b.installCount - a.installCount;
      }
      if (filters.sortBy === 'recently_updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      // Default: relevance / curated priority
      if (a.isCurated !== b.isCurated) {
        return a.isCurated ? -1 : 1;
      }
      return b.installCount - a.installCount;
    });
}
