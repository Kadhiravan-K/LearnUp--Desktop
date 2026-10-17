import { LearnUpPlugin } from '../types';

export const CORE_PLUGINS: LearnUpPlugin[] = [
  {
    id: 'vibe_code_generator',
    name: 'Vibe Code Generator (Alpha & Bravo)',
    description: 'Real-time AI code extractor. Mode Alpha synthesizes runnable vibe code from lecture transcripts. Mode Bravo performs visual frame analysis to reconstruct accurate project structures, configs, and multi-file codebases with 1-click tool connector and prompt export.',
    category: 'coding_vibe',
    kind: 'plugin',
    version: '2.4.0',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: true,
    icon: '⚡',
    capabilities: [
      'Mode Alpha: Transcript Vibe Synthesis',
      'Mode Bravo: Visual Frame & OCR Architecture',
      'One-Click Vibe Coding Tool Connectors',
      'Complete Project File Tree & Prompt Export'
    ]
  },
  {
    id: 'mermaid_architecture_flowchart',
    name: 'Multi-Domain Diagram & Flowchart Synthesizer',
    description: 'Extracts concepts, processes, medical pathways, and distributed systems architecture from lectures into interactive live Mermaid flowcharts, state diagrams, and topology graphs.',
    category: 'engineering',
    kind: 'plugin',
    version: '1.5.0',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: true,
    icon: '📐',
    capabilities: [
      'Real-time Mermaid Architecture Generator',
      'Domain Topology & Anatomical Diagrams',
      'SVG / PNG / Markdown Diagram Export',
      'Interactive Zoom & Pan Workstation'
    ]
  },
  {
    id: 'ai_tutor_diagnostic',
    name: 'AI Knowledge Diagnostic & Doubt Solver',
    description: 'Synthesizes weak topics from quizzes, predicts retention decay, and provides contextual Socratic answers in any domain.',
    category: 'ai_skills',
    kind: 'skill',
    version: '1.2.0',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: true,
    icon: '🤖',
    capabilities: ['Spaced Leitner analysis', 'Real-time Socratic Q&A', 'Concept AST analysis']
  },
  {
    id: 'fsrs_srs_engine',
    name: 'FSRS-4.5 Adaptive Spaced Repetition',
    description: 'Neural memory decay scheduling for card graduation, active recall queues, and Leitner intervals.',
    category: 'learning_science',
    kind: 'skill',
    version: '2.0.1',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: true,
    icon: '🧠',
    capabilities: ['FSRS-4.5 scheduling', 'Leitner 5-box system', 'Memory retention forecasting']
  },
  {
    id: 'code_sandbox_workstation',
    name: 'Technical Workstation & In-Browser Compiler',
    description: 'Docked live code editor supporting TypeScript, Rust, C++, and Python with WebAssembly execution.',
    category: 'coding_vibe',
    kind: 'plugin',
    version: '1.4.0',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: true,
    icon: '💻',
    capabilities: ['Wasm compiler', 'Split-screen terminal', 'Markdown code sync']
  },
  {
    id: 'multilingual_lecture_dub',
    name: 'Multi-Lingual Lecture Dub & Live Transcriber',
    description: 'Real-time phonetic transcription, synchronized bilingual subtitles, and domain-specific terminology glossaries.',
    category: 'learning_science',
    kind: 'skill',
    version: '1.3.0',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: false,
    icon: '🎙️',
    capabilities: ['Live phonetic transcription', 'Bilingual subtitle sync', 'Domain vocabulary flashcards']
  },
  {
    id: 'markdown_tex_notes',
    name: 'TeX & Markdown Scientific Note Studio',
    description: 'Transform standard study notes into a LaTeX & Markdown workstation with live KaTeX math formula rendering ($...$, $$...$$), split preview, and 1-click export to .md and .tex files.',
    category: 'engineering',
    kind: 'plugin',
    version: '2.1.0',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: true,
    icon: '📜',
    capabilities: [
      'KaTeX LaTeX Math Equations ($...$, $$...$$)',
      'Live Markdown Side-by-Side Preview',
      'Download Notes as .md Document',
      'Download Notes as .tex LaTeX Document'
    ]
  },
  {
    id: 'workspace_customization_studio',
    name: 'Workspace Appearance & Customization Studio',
    description: 'Advanced workspace customization panel providing custom hex primary accent pickers, color presets, multi-tier glassmorphism blur intensity, border radius styling, font scaling, and high-contrast overlay assist.',
    category: 'design_creative',
    kind: 'plugin',
    version: '1.4.0',
    author: 'LearnUp Core',
    isCore: true,
    isDefaultEnabled: true,
    icon: '🎨',
    capabilities: [
      'Custom Workspace Primary Hex Accent Picker',
      'Multi-Tier Frosted Glass Intensity',
      'Adaptive Border Radius Density',
      'Base UI Font Scale Calibration'
    ]
  },
  {
    id: 'theme_transparent',
    name: 'Transparent Crystal Glassmorphism Theme',
    description: 'Ultra-luminous frosted glass aesthetic with multi-stage backdrop blur, ambient cosmic nebula gradients, glowing neon borders, and floating translucent UI elements.',
    category: 'design_creative',
    kind: 'plugin',
    version: '1.0.0',
    author: 'LearnUp Design Lab',
    isCore: true,
    isDefaultEnabled: true,
    icon: '🔮',
    capabilities: ['Frosted Glassmorphism Surfaces', 'Nebula Backdrop Gradient', 'Luminous Glow Highlights']
  }
];

export const COMMUNITY_PLUGINS: LearnUpPlugin[] = [
  {
    id: 'obsidian_notion_vault_sync',
    name: 'Obsidian & Notion Vault Bi-Directional Syncer',
    description: 'Syncs timestamped notes, flashcards, vibe code snippets, and diagrams directly into local Obsidian Markdown vaults or Notion databases.',
    category: 'api_data',
    kind: 'plugin',
    version: '1.8.2',
    author: 'Community / vault-connect',
    isCore: false,
    isDefaultEnabled: true,
    icon: '🔌',
    capabilities: ['Obsidian Local Vault Sync', 'Notion Database API Webhooks', 'Automated Daily Study Log Export']
  },
  {
    id: 'domain_taxonomy_glossary',
    name: 'Medical & Domain Taxonomy Concept Explorer',
    description: 'Domain-agnostic semantic dictionary that breaks down complex terminology in medicine, law, aerospace, engineering, and mathematics.',
    category: 'engineering',
    kind: 'skill',
    version: '1.1.0',
    author: 'Community / taxonomy-lab',
    isCore: false,
    isDefaultEnabled: true,
    icon: '🔬',
    capabilities: ['Semantic term lookup', 'Cross-discipline analogies', 'Visual concept hierarchy']
  },
  {
    id: 'ultradian_flow_orchestrator',
    name: 'Ultradian Rhythm & Flow State Orchestrator',
    description: 'Adaptive binaural beat modulation and circadian sprint scheduling tailored to cognitive load and time of day.',
    category: 'productivity',
    kind: 'skill',
    version: '2.2.0',
    author: 'Community / neuro-flow',
    isCore: false,
    isDefaultEnabled: true,
    icon: '⏱️',
    capabilities: ['40Hz Gamma & Theta waves', 'Circadian sprint pacing', 'Focus fatigue detector']
  },
  {
    id: 'design_system_component_inspector',
    name: 'UI/UX Component & Token Inspector',
    description: 'Extracts color palettes, typography scales, spacing tokens, and Figma-style design specifications directly from visual design lectures.',
    category: 'design_creative',
    kind: 'plugin',
    version: '1.0.8',
    author: 'Community / design-ops',
    isCore: false,
    isDefaultEnabled: false,
    icon: '🎨',
    capabilities: ['Figma token extractor', 'Color contrast ratio checker', 'CSS/Tailwind class generator']
  },
  {
    id: 'anki_apkg_exporter',
    name: 'Anki Deck Exporter (.apkg)',
    description: 'One-click export of video notes, code snippets, and timestamped flashcards directly to native Anki decks.',
    category: 'learning_science',
    kind: 'plugin',
    version: '0.9.3',
    author: 'Community / anki-dev',
    isCore: false,
    isDefaultEnabled: false,
    icon: '🎴',
    capabilities: ['Native .apkg packaging', 'Cloze deletion formatting', 'Media asset bundling']
  },
  {
    id: 'latex_typst_renderer',
    name: 'LaTeX & Typst Math Engine',
    description: 'High-speed KaTeX and Typst equation rendering in Markdown study notes and flashcards.',
    category: 'engineering',
    kind: 'plugin',
    version: '1.3.2',
    author: 'Community / math-sci',
    isCore: false,
    isDefaultEnabled: true,
    icon: '📐',
    capabilities: ['KaTeX hardware render', 'Typst compiler', 'Interactive graph plotter']
  }
];

export const ALL_PLUGINS = [...CORE_PLUGINS, ...COMMUNITY_PLUGINS];

