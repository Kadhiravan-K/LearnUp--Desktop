# SF-130 — LearnUp-Desktop: Marketplace Compatibility & Offline Foundation Report

## Executive Summary

Milestone **SF-130** implements the desktop side of the **LearnUp Community Marketplace** foundation within `LearnUp-Desktop`. 

This milestone ensures full interoperability with `LearnUp-Web`'s marketplace architecture while preserving desktop-specific principles:
1. **Offline-First SQLite Architecture**: The installed application and local data remain 100% functional without an active internet connection.
2. **Skill-to-Roadmap Track Conversion**: Installed marketplace skills can be converted directly into local SQLite `RoadmapTrack` and `RoadmapNode` entities.
3. **Local Marketplace Caching**: Allows users to browse previously downloaded catalogs and inspect installed extensions while offline.
4. **Safety & Zero Touch of SF-124**: The installed SF-124 binary (`%LOCALAPPDATA%\LearnUp Desktop\learnup-desktop.exe`) and user profile database remain untouched.

---

## Architecture & Integration Details

```
                          +-------------------------------------+
                          |        Marketplace Manifest         |
                          |  (SkillManifest, Topological Order) |
                          +------------------+------------------+
                                             |
                                             v
                          +-------------------------------------+
                          |   convertSkillManifestToLocalRoadmap|
                          +------------------+------------------+
                                             |
                      +----------------------+----------------------+
                      |                                             |
                      v                                             v
        +---------------------------+                 +---------------------------+
        |   LocalRoadmapTrackDraft  |                 |  LocalRoadmapNodeDraft[]  |
        |  (Title, Domain, Nodes)   |                 |  (Sequenced, Active/Locked|
        |                           |                 |   YouTube Embed URLs)     |
        +-------------+-------------+                 +-------------+-------------+
                      |                                             |
                      +----------------------+----------------------+
                                             |
                                             v
                              +-----------------------------+
                              |   Desktop SQLite Storage    |
                              |   (%APPDATA%\learnup.db)    |
                              +-----------------------------+
```

---

## 1. Implemented Modules (`src/core/marketplace/`)

The desktop core was augmented with modular, zero-dependency marketplace primitives in `src/core/marketplace/`:

- **`contracts.ts`**: TypeScript definitions and Zod schemas shared with `LearnUp-Web`:
  - `SkillManifestSchema`, `TemplateManifestSchema`, `PluginManifestSchema`.
  - `MarketplaceItemSchema`, `MarketplaceVersionSchema`, `MarketplaceInstallationSchema`.
  - Fully compatible across both Zod v3 (Web) and Zod v4 (Desktop).
- **`dag.ts`**: Directed Acyclic Graph validation, 3-color DFS cycle detector, and Kahn topological sort ordering.
- **`rating.ts`**: Bayesian Weighted Rating calculation ($WR = \frac{v}{v+m} \cdot R + \frac{m}{v+m} \cdot C$) and rating statistics calculator.
- **`search.ts`**: Query tokenizer, multi-attribute relevance scorer, category/difficulty filtering, and multi-criteria sorting.
- **`validation.ts`**: High-level manifest validation with strict plugin capability allowlisting and error formatting.
- **`offline.ts`**:
  - `convertSkillManifestToLocalRoadmap(manifest)`: Algorithmic transformation of a `SkillManifest` into a sequential desktop roadmap track with prerequisite node pointers and YouTube embed URLs.
  - `DesktopMarketplaceCache`: In-memory / local storage cache for browsing items and tracking installation states offline.

---

## 2. Skill-to-Local-Roadmap Transformation

When a user installs a Skill from the marketplace, the desktop application transforms the declarative manifest into local SQLite milestones:

```typescript
const localRoadmap = convertSkillManifestToLocalRoadmap(manifest);
// Result:
// - Title & Category mapped from manifest
// - Nodes sorted in topological execution sequence
// - Node 1 set to 'active', remaining nodes set to 'locked'
// - Prerequisites linked by node index
// - YouTube video/playlist canonical URLs generated
```

This guarantees that community-created roadmaps immediately integrate into the existing desktop Roadmaps engine (`src/views/RoadmapsView.tsx`) without requiring custom rendering code or remote server connectivity.

---

## 3. Sandboxing & Security Guarantees

1. **Strict Plugin Capabilities Allowlist**:
   Only 9 declarative capabilities are permitted:
   - `storage:local`
   - `ui:sidebar-badge`
   - `ui:theme-override`
   - `ui:modal`
   - `analytics:streak-hook`
   - `export:markdown`
   - `export:json`
   - `import:markdown`
   - `shortcuts:register`
2. **Explicit Rejection of Dangerous Execution**:
   Any attempt to supply `eval`, `script`, `shell`, `exec`, `network:*`, or arbitrary HTML is caught and rejected by `validatePluginManifest`.
3. **No Binary Video Storage**:
   Video courses are verified to use approved YouTube video/playlist IDs only; no binary downloads or unauthorized media streams are written to disk.

---

## 4. Verification & Quality Gates

### 4.1 Unit Test Suite (`tests/marketplace-foundation.test.ts`)
- **14/14 tests passed** in `LearnUp-Desktop`:
  - Valid SkillManifest & DAG graph topological sort.
  - Directed cycle detection and error reporting.
  - Self-loop rejection and duplicate node ID rejection.
  - Template manifest validation and bookmark protocol validation.
  - Plugin capability allowlist and dangerous capability rejection.
  - Bayesian rating calculations.
  - Desktop offline conversion (`convertSkillManifestToLocalRoadmap`).
  - `DesktopMarketplaceCache` offline installation tracking.

### 4.2 Overall Desktop Test Suite (`npm test`)
- **All 4 test files passed (84 tests passed, 0 failed)**:
  - `tests/sync-engine.test.ts` (31 tests)
  - `tests/shared-core.test.ts` (27 tests)
  - `tests/adapters.test.ts` (12 tests)
  - `tests/marketplace-foundation.test.ts` (14 tests)

### 4.3 Typecheck & Build
- **`npm run typecheck`**: Passed with 0 errors.
- **`npm run build`**: Vite + TypeScript compiled successfully (268 modules, 3.67s).
- **`cargo check`**: Rust backend compiled cleanly with 0 errors and 0 warnings.
- **Installed App Safety**: `%LOCALAPPDATA%\LearnUp Desktop\learnup-desktop.exe` was never touched or modified.
