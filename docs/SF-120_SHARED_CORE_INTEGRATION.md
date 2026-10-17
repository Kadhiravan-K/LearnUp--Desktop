# SF-120 — LearnUp Shared Core Integration Report

**Primary Project:** LearnUp-Desktop  
**Source Project (Read-Only):** LearnUp-Web  
**Status:** COMPLETE (Integrated, Tested & Verified in Live WebView2)  
**Deliverable Document:** `docs/SF-120_SHARED_CORE_INTEGRATION.md`  
**Date:** October 16, 2026  

---

## 1. Executive Summary

Milestone **SF-120** successfully integrated the verified business logic and domain models from **LearnUp-Web** into **LearnUp-Desktop** without introducing Next.js server dependencies, Supabase server-role clients, or a bundled Node.js server. 

The architecture establishes a framework-independent **Shared Core** (`src/core/`) that is 100% decoupling-compliant, reusable, and type-safe. Native SQLite persistence (via embedded `rusqlite` in Tauri 2) and complete multi-profile guest data isolation were strictly preserved. All quality gates—including TypeScript compilation, Vite production bundling, Vitest suite (28/28 passed), Cargo check, and live native Windows WebView2 automation via CDP (0 console errors)—passed with complete success.

---

## 2. Dependency Audit & Reusability Classification

An exhaustive audit of `LearnUp-Web` identified reusable assets and classified each into clear boundary tiers:

| Component / Subsystem | Source Location in LearnUp-Web | Classification | Integration Treatment in LearnUp-Desktop |
|---|---|---|---|
| **Domain Contracts & Types** | `lib/types/index.ts`, `lib/storage/contracts.ts` | **Directly Reusable** | Extracted cleanly to `src/core/types/index.ts`. Defines storage records, mutation journal, user profiles, and learning entities without browser or server dependencies. |
| **Error Handling Architecture** | `lib/errors/index.ts` | **Directly Reusable** | Extracted to `src/core/errors/index.ts`. Provides `AppError`, `ErrorCode`, and formatters without Next.js HTTP response objects. |
| **Runtime Validation Schemas** | `lib/validation/schemas.ts`, `lib/roadmaps/career-schema.ts` | **Directly Reusable** | Extracted to `src/core/validation/schemas.ts` and `src/core/roadmaps/schema.ts` using `zod`. Enforces strict validation at input boundaries. |
| **YouTube URL Parser & Import** | `lib/youtube/parser.ts` | **Directly Reusable** | Extracted to `src/core/youtube/parser.ts`. Robust regex parsing for watch, shorts, playlist, embed, and youtu.be URLs with canonicalization and batch extraction. |
| **Module Registry & Lifecycles** | `lib/modules/types.ts`, `registry.ts` | **Directly Reusable** | Extracted to `src/core/modules/types.ts` and `registry.ts`. Enforces locking for mandatory core modules (`core-dashboard`, `core-library`, `core-player`, `core-notes`) and dependency trees for feature modules. |
| **Module Manager Runtime** | `lib/modules/manager.ts` | **Reusable after Refactoring** | Extracted to `src/core/modules/manager.ts`. Employs guest profile scoped storage keys (`learnup_enabled_modules_v2_user_${id}`) to guarantee profile isolation. |
| **Note Formatting & Equations** | `lib/utils/formatNote.tsx` | **Directly Reusable** | Extracted to `src/core/notes/format.tsx`. Renders LaTeX math equations (`$$ ... $$`), bold markdown, inline code, and lists to styled React components. |
| **Notes Service Logic** | `lib/db/notes-repository.ts` | **Reusable after Refactoring** | Decoupled from `SupabaseClient`. Refactored into `src/core/notes/service.ts`, routing operations directly through `IStorageAdapter` -> native SQLite. Includes video timestamp parsing (`[mm:ss]`). |
| **Study Streak & Progress Logic** | `lib/services/analytics-service.ts` | **Reusable after Refactoring** | Decoupled from Postgres queries. Pure algorithmic calculation extracted to `src/core/progress/streaks.ts` and `calculator.ts`, operating on local activity dates. |
| **Focus Session Logic** | `lib/hooks/useFocusTimer.ts`, `FocusTimerContext` | **Directly Reusable** | Extracted to `src/core/focus/timer.ts`. Provides standard Pomodoro cycles (`25/5/15`), mode durations, and interval transitions. |
| **Curated Skill Roadmaps** | `lib/roadmaps/career-types.ts`, `templates/` | **Directly Reusable** | Extracted to `src/core/roadmaps/templates.ts`. Bundles rich offline learning roadmaps for Full-Stack TypeScript and Rust Systems Engineering. |
| **Design Tokens** | `lib/theme/tokens.ts` | **Directly Reusable** | Extracted to `src/core/theme/tokens.ts`. Defines motion, spacing, radius, and color tokens. |
| **Next.js Server API Routes** | `app/api/courses/*`, `app/api/notes/*` | **Web-Only** | Excluded. Desktop operates completely local-first via Tauri IPC; no HTTP server overhead. |
| **Supabase Postgres Repositories** | `lib/db/repository.ts` | **Web-Only** | Excluded. Desktop persistence is governed by `rusqlite` WAL database. |
| **node:sqlite Bridge** | `lib/storage/sqlite-adapter.ts` | **Incomplete on Web** | Excluded. Replaced by verified Tauri 2 native SQLite engine (`src-tauri/src/db.rs`). |

---

## 3. Shared Code Boundaries & Architecture

### Approach: Controlled Source Extraction vs Versioned Monorepo
A **controlled source extraction** approach was selected for this milestone:
1. **Zero Impact on Sibling Repositories:** Sibling project `LearnUp-Web` was treated as strictly read-only and required zero edits, configuration modifications, or npm symlink dependencies.
2. **Framework Independence:** All code in `src/core/` has **zero imports** from Next.js, React DOM server, Supabase, Tauri IPC, or native SQLite binaries.
3. **Pure Boundary Contracts:** All interactions between the UI, storage, and platform layer flow through explicit TypeScript interfaces:
   - `IStorageAdapter`: Pure abstraction over profile, note, bookmark, progress, and learning item persistence.
   - `IPlatformAdapter`: Pure abstraction over network status, external browser launching, YouTube metadata resolution, and notifications.

### Directory Structure of `src/core/`
```
src/core/
├── index.ts                  # Central barrel export
├── errors/
│   └── index.ts              # AppError and ErrorCode
├── types/
│   └── index.ts              # Core domain models and storage contracts
├── validation/
│   └── schemas.ts            # Zod validation schemas and validateInput helper
├── modules/
│   ├── types.ts              # ModuleManifest, ModuleCategory, PermissionScope
│   ├── registry.ts           # MODULE_REGISTRY and validateModuleAction
│   └── manager.ts            # Profile-scoped ModuleManager
├── youtube/
│   └── parser.ts             # Regex parser, canonicalizer, and batch extractor
├── library/
│   └── service.ts            # Course builder, progress calculator, duration formatter
├── notes/
│   ├── service.ts            # Timestamp parser and durable note operations
│   └── format.tsx            # Markdown and LaTeX equation renderer
├── progress/
│   ├── streaks.ts            # Active streak, longest streak, and heatmap generator
│   └── calculator.ts         # User analytics summary aggregator
├── focus/
│   └── timer.ts              # Pomodoro configuration and interval transitions
├── roadmaps/
│   ├── types.ts              # Roadmap models and milestone structures
│   ├── schema.ts             # Zod validation for roadmaps
│   └── templates.ts          # Bundled offline curated roadmaps
└── theme/
    └── tokens.ts             # Spacing, motion, and design tokens
```

---

## 4. Desktop-Specific Adapters

The desktop-specific implementations reside entirely outside `src/core/` within `src/adapters/`:

1. **`TauriStorageAdapter` (`src/adapters/TauriStorageAdapter.ts`)**:
   - Implements `IStorageAdapter`.
   - Dispatches calls across the Tauri 2 IPC bridge to `rusqlite 0.32.1` in `src-tauri/src/db.rs`.
   - Operates in WAL mode with prepared SQL statements and transaction safety.
2. **`WebFallbackAdapter` (`src/adapters/WebFallbackAdapter.ts`)**:
   - Implements `IStorageAdapter` for test runners and browser development.
   - Uses `localStorage` with JSON serialization and simulated async delays.
3. **`TauriPlatformAdapter` (`src/adapters/platform.ts`)**:
   - Implements `IPlatformAdapter`.
   - Uses `@tauri-apps/plugin-shell` for opening links in the external default browser (`openExternalUrl`).
   - Uses native Tauri commands for network reachability checks (`check_online_status`).

---

## 5. Features Integrated & Verified

| Feature Area | Integration Specifics | Verification Method & Result |
|---|---|---|
| **1. Domain Schemas** | Strict input validation via `validateInput()` and Zod schemas (`importRequestSchema`, `recordFocusSessionSchema`). | Unit tests in `tests/shared-core.test.ts` (PASS). |
| **2. Module Registry** | Core modules locked; optional modules toggleable with dependency checking. | Unit test + live native toggle test in Settings view (PASS). |
| **3. YouTube URL Handling** | Canonicalization for watch, playlist, embed, shorts, and youtu.be. Deduplication of multi-URL blocks. | 7 unit test assertions + live import in WebView2 (PASS). |
| **4. Notes Formatting & Timestamps** | Inline LaTeX math equations (`$$ ... $$`), bold markdown, and `[mm:ss]` timestamp parsing. | Verified in WebView2; rendered equation block and formatted text cleanly (PASS). |
| **5. Study Streak Tracking** | Local calendar date streak calculations (`calculateStreaks`). Gaps >1 day reset streak; consecutive days maintain streak. | 4 unit tests + live Dashboard metric card rendering (PASS). |
| **6. Focus Session Logic** | 25/5 Pomodoro intervals, interval advancement, and break cycles. | Unit tests for cycle transitions + live timer countdown (PASS). |
| **7. Skill Roadmaps View** | Curated offline tracks for Full-Stack TypeScript and Rust Systems Engineering. | Verified in WebView2; rendered roadmap phases, milestone hours, and action triggers (PASS). |

---

## 6. Native WebView2 Live Interaction Results

All tests were executed against the active desktop process (`learnup-desktop.exe` PID 25980 with Microsoft Edge WebView2) over the Chrome DevTools Protocol:

```
=== SF-120 Live Native WebView2 Verification Results ===
┌─────────┬────────────────────────────────────────────────────────────────────┬────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (index) │ name                                                               │ status │ detail                                                                                           │
├─────────┼────────────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0       │ '1. Roadmaps Module renders curated offline templates'             │ 'PASS' │ 'Found curated roadmaps: Full-Stack TypeScript & React Mastery; Rust & Native Desktop Engineering'│
│ 1       │ '2. Resume Lecture navigates to video player in Library'           │ 'PASS' │ 'Iframe mounted successfully: https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?...'           │
│ 2       │ '3. YouTube embedding restrictions and external fallback reported' │ 'PASS' │ 'Policy disclaimer confirmed. Fallback launcher verified.'                                       │
│ 3       │ '4. Notes formatting with markdown and equations'                  │ 'PASS' │ 'Rendered math equation ($$ E = mc^2 $$) and formatted markdown (<strong>Key Takeaway</strong>)'  │
│ 4       │ '5. Study streak calculated via shared core'                       │ 'PASS' │ 'Streak card active: "... Study Streak (Shared Core) 🔥 1d ..."'                                 │
│ 5       │ '6. Profile switching preserves total data isolation'              │ 'PASS' │ 'Profile "Guest 15" has 2 notes loaded in isolated scope.'                                       │
└─────────┴────────────────────────────────────────────────────────────────────┴────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘
Frontend Console Errors during test session: 0
```

Regression verification via `tests/test-webview2-live.mjs`:
- All 12/12 foundation interactions from SF-121 **PASSED**.
- Zero frontend console errors logged.

---

## 7. SQLite Persistence Results

Persistence verification confirmed the following invariants against `%APPDATA%\com.learnup.desktop\learnup.db`:
- **Database Engine:** Embedded `rusqlite 0.32.1` with native C bindings compiled directly into `learnup-desktop.exe`.
- **Journal Mode:** Write-Ahead Logging (`WAL`).
- **Data Survivability:** Notes, courses, and guest profiles created during tests were queried from disk across page reloads and process restarts.
- **Tombstoning:** Note deletions execute soft deletion with timestamping, immediately removing items from active queries while preserving audit trail integrity.
- **Data Isolation:** User and Guest profiles each maintain unique scopes (`userId`), preventing cross-account data leaks.

---

## 8. Features Deferred / Not Yet Integrated

The following web-specific or server-dependent features remain deliberately excluded from this desktop milestone:
1. **Live Cloud Synchronization:** Supabase remote syncing and conflict resolution remain deferred (desktop remains strictly local-first).
2. **AI Career Roadmap Generation (LLM Agent):** Real-time web search and dynamic LLM roadmap generation require server-side OpenAI/Anthropic API keys. Curated offline roadmaps are bundled instead.
3. **Web Audio Synthesizers for Soundscapes:** Ambient binaural audio generation remains optional and will be wired in future audio enhancements.
4. **YouTube Data API v3 Backend Proxy:** Metadata resolution uses native fallback and oEmbed rather than requiring a dedicated YouTube API server key.

---

## 9. Quality Gates Summary

| Verification Check | Target / Command | Status | Result |
|---|---|---|---|
| **TypeScript Compilation** | `npm run typecheck` (`tsc --noEmit`) | **PASS** | Exit code 0 (0 errors) |
| **Vite Production Bundler** | `npm run build` | **PASS** | Exit code 0 (`dist/` generated in 1.78s) |
| **Unit Test Suite** | `npm test` (`vitest run`) | **PASS** | 28/28 tests passed (2 test suites) |
| **Rust Backend Check** | `cargo check` (in `src-tauri`) | **PASS** | Exit code 0 (Finished in 5.23s) |
| **Live WebView2 Automation** | `node tests/test-sf120-core-live.mjs` | **PASS** | 6/6 tests passed (0 console errors) |
| **Full Regression Suite** | `node tests/test-webview2-live.mjs` | **PASS** | 12/12 tests passed (0 console errors) |

---

## 10. Recommended Next Milestone

### Recommended Milestone: SF-122 — Production Packaging & Code Signing Prep
With the shared core cleanly integrated and verified in native WebView2, the recommended next steps are:
1. **Release Compilation:** Execute `tauri build` to produce optimized, stripped native release binaries.
2. **NSIS Installer Customization:** Configure setup wizard assets, license agreements, and desktop start-menu shortcuts.
3. **Clean Machine Smoke Test:** Verify installation and execution on a clean Windows environment without Node.js, Vite, or Cargo installed.
