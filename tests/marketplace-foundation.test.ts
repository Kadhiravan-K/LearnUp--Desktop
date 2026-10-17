import { describe, it, expect } from 'vitest';
import {
  SkillManifest,
  TemplateManifest,
  PluginManifest,
  validateSkillManifest,
  validateTemplateManifest,
  validatePluginManifest,
  validateAnyManifest,
  calculateBayesianRating,
  calculateItemRatingStats,
  filterMarketplaceItems,
  convertSkillManifestToLocalRoadmap,
  DesktopMarketplaceCache,
  MarketplaceItem,
} from '../src/core/marketplace';

describe('LearnUp-Desktop — Marketplace Foundation & Offline Compatibility Tests', () => {
  // ==========================================
  // 1. Skill Roadmap Manifest & DAG
  // ==========================================
  describe('SkillManifest & DAG Graph Validation', () => {
    const validSkill: SkillManifest = {
      schemaVersion: '1.0.0',
      category: 'skill',
      title: 'Fullstack Rust & React Architecture',
      description: 'Comprehensive guided curriculum for mastering high-performance web and desktop applications.',
      domain: 'Software Engineering',
      difficulty: 'intermediate',
      estimatedHours: 40,
      tags: ['rust', 'react', 'tauri', 'sqlite'],
      nodes: [
        {
          id: 'node-rust-basics',
          title: 'Rust Ownership and Memory Safety',
          description: 'Learn borrow checker and memory layout',
          youtubeVideoId: 'dQw4w9WgXcQ',
          durationSeconds: 3600,
          keyTakeaways: ['Ownership rules', 'Borrowing and Lifetimes'],
          tags: ['rust', 'basics'],
        },
        {
          id: 'node-async-rust',
          title: 'Async Tokio Runtime',
          description: 'Concurrency and async channels',
          youtubeVideoId: 'jNQXAC9IVRw',
          durationSeconds: 4200,
          keyTakeaways: ['Tokio tasks', 'mpsc channels'],
          tags: ['rust', 'async'],
        },
        {
          id: 'node-tauri-interop',
          title: 'Tauri IPC and Commands',
          description: 'Connecting React frontend with Rust core',
          youtubeVideoId: '9bZkp7q19f0',
          durationSeconds: 2800,
          keyTakeaways: ['IPC commands', 'State management'],
          tags: ['tauri', 'desktop'],
        },
      ],
      edges: [
        { source: 'node-rust-basics', target: 'node-async-rust' },
        { source: 'node-async-rust', target: 'node-tauri-interop' },
      ],
    };

    it('validates a correct SkillManifest with valid DAG and topological sort', () => {
      const result = validateSkillManifest(validSkill);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.sortedNodeIds).toEqual([
          'node-rust-basics',
          'node-async-rust',
          'node-tauri-interop',
        ]);
      }
    });

    it('detects directed cycles in skill roadmap and reports cycle path', () => {
      const cyclicSkill: SkillManifest = {
        ...validSkill,
        edges: [
          { source: 'node-rust-basics', target: 'node-async-rust' },
          { source: 'node-async-rust', target: 'node-tauri-interop' },
          { source: 'node-tauri-interop', target: 'node-rust-basics' }, // Cycle!
        ],
      };

      const result = validateSkillManifest(cyclicSkill);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('Directed cycle detected'))).toBe(true);
      }
    });

    it('rejects self-referencing edges', () => {
      const selfLoopSkill = {
        ...validSkill,
        edges: [{ source: 'node-rust-basics', target: 'node-rust-basics' }],
      };

      const result = validateSkillManifest(selfLoopSkill);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('Self-referencing edges'))).toBe(true);
      }
    });

    it('rejects duplicate node IDs', () => {
      const duplicateSkill: SkillManifest = {
        ...validSkill,
        nodes: [
          validSkill.nodes[0],
          { ...validSkill.nodes[1], id: 'node-rust-basics' },
        ],
        edges: [],
      };

      const result = validateSkillManifest(duplicateSkill);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('Duplicate node ID detected'))).toBe(true);
      }
    });

    it('validates 11-char YouTube video ID and rejects invalid IDs', () => {
      const invalidYtSkill = {
        ...validSkill,
        nodes: [
          {
            ...validSkill.nodes[0],
            youtubeVideoId: 'bad-id',
          },
        ],
      };

      const result = validateSkillManifest(invalidYtSkill);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================
  // 2. Template Manifest Validation
  // ==========================================
  describe('TemplateManifest Validation', () => {
    const validTemplate: TemplateManifest = {
      schemaVersion: '1.0.0',
      category: 'template',
      title: 'Deep Focus Software Engineer Workspace',
      description: 'Preconfigured workspace setup with focus timer, notes, and curated technical bookmarks.',
      targetDomain: 'Software Engineering',
      modulesConfig: {
        enabledModuleIds: ['library', 'notes', 'focus', 'roadmaps'],
        defaultModule: 'focus',
      },
      focusTimerConfig: {
        defaultMinutes: 50,
        shortBreakMinutes: 10,
        longBreakMinutes: 30,
        soundEnabled: true,
      },
      appearanceConfig: {
        theme: 'dark',
        accentColor: '#10b981',
        customCssAllowed: false,
      },
      starterBookmarks: [
        {
          title: 'Official Rust Docs',
          url: 'https://doc.rust-lang.org/book/',
          category: 'Documentation',
        },
      ],
      tags: ['productivity', 'engineering'],
    };

    it('validates a well-formed TemplateManifest', () => {
      const result = validateTemplateManifest(validTemplate);
      expect(result.success).toBe(true);
    });

    it('rejects unsafe bookmark URL schemes (e.g. javascript:)', () => {
      const unsafe = {
        ...validTemplate,
        starterBookmarks: [{ title: 'XSS', url: 'javascript:alert(1)' }],
      };
      const result = validateTemplateManifest(unsafe);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================
  // 3. Plugin Manifest & Capability Allowlist
  // ==========================================
  describe('PluginManifest & Capability Allowlist Enforcement', () => {
    const validPlugin: PluginManifest = {
      schemaVersion: '1.0.0',
      category: 'plugin',
      pluginId: 'markdown-notes-exporter',
      name: 'Markdown Notes Exporter',
      description: 'Export all personal notes into standardized Markdown files with frontmatter.',
      version: '1.2.0',
      author: 'LearnUp Community',
      icon: 'file-text',
      capabilities: ['export:markdown', 'storage:local', 'shortcuts:register'],
    };

    it('validates a compliant PluginManifest with allowlisted capabilities', () => {
      const result = validatePluginManifest(validPlugin);
      expect(result.success).toBe(true);
    });

    it('strictly rejects dangerous capabilities like eval, shell, exec', () => {
      const malicious = {
        ...validPlugin,
        capabilities: ['storage:local', 'exec', 'shell'],
      };
      const result = validatePluginManifest(malicious);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('Disallowed capabilities detected'))).toBe(true);
      }
    });
  });

  // ==========================================
  // 4. Bayesian Weighted Rating
  // ==========================================
  describe('Bayesian Weighted Rating Algorithm', () => {
    it('returns prior mean when review count is zero', () => {
      const bayesian = calculateBayesianRating(0, 0, { minimumReviews: 5, priorMean: 3.5 });
      expect(bayesian).toBe(3.5);
    });

    it('balances single extreme reviews towards prior mean', () => {
      const singleReview = calculateBayesianRating(1, 5.0, { minimumReviews: 5, priorMean: 3.5 });
      expect(singleReview).toBe(3.75);
    });

    it('calculates stats from ratings array', () => {
      const stats = calculateItemRatingStats([5, 5, 4, 5, 5], { minimumReviews: 5, priorMean: 3.5 });
      expect(stats.reviewCount).toBe(5);
      expect(stats.averageRating).toBe(4.8);
      expect(stats.bayesianRating).toBe(4.15);
    });
  });

  // ==========================================
  // 5. Desktop Offline Conversion & Caching
  // ==========================================
  describe('Desktop Offline Skill Conversion & Cache', () => {
    const sampleSkill: SkillManifest = {
      schemaVersion: '1.0.0',
      category: 'skill',
      title: 'Tauri & Rust Desktop Engineering',
      description: 'Master local desktop app development using Rust and React.',
      domain: 'Desktop Engineering',
      difficulty: 'intermediate',
      estimatedHours: 25,
      nodes: [
        {
          id: 'step-1',
          title: 'Tauri Architecture & Core',
          description: 'Understanding WebView2 and Rust IPC',
          youtubeVideoId: 'dQw4w9WgXcQ',
          durationSeconds: 1800,
        },
        {
          id: 'step-2',
          title: 'SQLite Local Database',
          description: 'Local-first data persistence with WAL mode',
          youtubeVideoId: 'jNQXAC9IVRw',
          durationSeconds: 2400,
        },
      ],
      edges: [{ source: 'step-1', target: 'step-2' }],
    };

    it('converts a SkillManifest into an offline-ready local roadmap track draft', () => {
      const localRoadmap = convertSkillManifestToLocalRoadmap(sampleSkill);
      expect(localRoadmap.title).toBe(sampleSkill.title);
      expect(localRoadmap.category).toBe(sampleSkill.domain);
      expect(localRoadmap.nodes.length).toBe(2);

      // Check first node
      expect(localRoadmap.nodes[0].nodeNumber).toBe('1');
      expect(localRoadmap.nodes[0].title).toBe('Tauri Architecture & Core');
      expect(localRoadmap.nodes[0].status).toBe('active'); // First node active
      expect(localRoadmap.nodes[0].canonicalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      // Check second node
      expect(localRoadmap.nodes[1].nodeNumber).toBe('2');
      expect(localRoadmap.nodes[1].status).toBe('locked'); // Dependent locked
      expect(localRoadmap.nodes[1].prerequisiteNodeNumber).toBe('1');
    });

    it('manages local marketplace cache and offline installations', () => {
      const cache = new DesktopMarketplaceCache();
      const mockItem: MarketplaceItem = {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'test-skill',
        category: 'skill',
        title: 'Test Skill',
        summary: 'Summary',
        description: 'Description',
        authorId: '22222222-2222-2222-2222-222222222222',
        authorName: 'Author',
        status: 'published',
        pricing: 'free',
        priceCents: 0,
        currentVersion: '1.0.0',
        domain: 'Engineering',
        tags: ['test'],
        ratingAverage: 4.5,
        ratingBayesian: 4.2,
        ratingCount: 10,
        installCount: 50,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      };

      cache.cacheCatalog([mockItem]);
      expect(cache.getCatalog().length).toBe(1);
      expect(cache.getItem(mockItem.id)?.title).toBe('Test Skill');

      // Test installation tracking
      expect(cache.isInstalled(mockItem.id)).toBe(false);
      cache.recordInstallation(mockItem.id);
      expect(cache.isInstalled(mockItem.id)).toBe(true);
      expect(cache.getItem(mockItem.id)?.installCount).toBe(51);

      // Test uninstallation
      cache.recordUninstallation(mockItem.id);
      expect(cache.isInstalled(mockItem.id)).toBe(false);
    });
  });
});
