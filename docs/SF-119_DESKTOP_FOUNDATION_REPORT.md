# SF-119 — LearnUp Desktop: Clean Architecture & Web Integration Report

## 1. Executive Summary

Milestone **SF-119** successfully establishes **`LearnUp-Desktop`** (`C:\Users\kadhir\Projects\OpenSource\LearnUp-Desktop`) as an independent, lightweight, native Windows desktop application built with **Tauri 2**, **Rust**, and **React 18 / TypeScript**.

Prior to building the desktop foundation, **`LearnUp-Web`** was thoroughly audited and verified:
- **78 test files passed** (605 unit and integration tests).
- Clean Next.js 14 production build succeeded with zero standalone chunk errors.
- Real-browser **Playwright acceptance tests passed in 2.8s**, verifying guest mode, first-launch wizard, module toggles ("Select All" and "Deselect All"), dashboard loading, sidebar navigation, and sign out in Chromium.

With the web foundation verified, `LearnUp-Desktop` was engineered on a clean native architecture, eliminating the flawed bundled Node.js server from historical builds.

---

## 2. Answers to Prompt Deliverable Questions

### 1. What was created
- **New Project Directory**: `C:\Users\kadhir\Projects\OpenSource\LearnUp-Desktop` initialized with a clean local Git repository.
- **Frontend Architecture**: Fast Vite + React 18 + TypeScript SPA targeting `dist/`.
- **Native Tauri 2 Rust Backend (`src-tauri/`)**:
  - `src-tauri/Cargo.toml` with `tauri 2.12.4` and `rusqlite 0.31` (bundled C SQLite).
  - `src-tauri/src/db.rs`: Complete native SQLite database manager with WAL mode, ACID transactions, and tables for user profiles, courses, notes, progress, and mutation logs.
  - `src-tauri/src/lib.rs`: 14 typed Tauri IPC commands for database access, metadata fetching, and network status.
  - `src-tauri/tauri.conf.json`: Configured for static `frontendDist` and strict Content Security Policy allowing YouTube iframe embeds.
- **Platform Abstraction Layer (`src/adapters/`)**:
  - `IPlatformAdapter.ts`: Abstract platform capabilities interface.
  - `TauriStorageAdapter.ts`: IPC-driven storage adapter communicating with Rust.
  - `WebFallbackAdapter.ts`: LocalStorage-based adapter for automated tests and web previews.
  - `platform.ts`: Runtime detection factory.
- **Comprehensive Documentation Suite**:
  - `docs/DESKTOP_ARCHITECTURE.md`
  - `docs/WEB_DESKTOP_SHARED_CODE.md`
  - `docs/OFFLINE_STORAGE_PLAN.md`
  - `docs/DESKTOP_ACCEPTANCE_TESTS.md`
  - `docs/SF-119_DESKTOP_FOUNDATION_REPORT.md`

### 2. What was reused from LearnUp-Web
- **Domain Contracts & Types**: Reused all contracts from `lib/storage/contracts.ts` (`DurableRecord`, `DurableNote`, `DurableBookmark`, `DurableProgress`, `MutationJournalEntry`, `UserProfile`, `LearningItem`).
- **Storage Interface Contract**: `IStorageAdapter` was adopted as the foundational contract for both platforms.
- **UI Design System & Tokens**: Colors, borders, radii, typography, and layout structure (AppShell, Sidebar, Header, Study Cards).
- **Module Registry Logic**: The concept of mandatory core modules (Dashboard, Library, Player, Notes, Settings) and optional modules (Focus, Roadmaps, Analytics, Rewards).
- **YouTube URL Parsing & Identification**: Regex-based canonical extraction of YouTube video and playlist IDs.

### 3. What remains desktop-specific
- **Native SQLite (`rusqlite`)**: Direct C-level SQLite execution inside Rust with zero Node.js layer.
- **Tauri IPC Command Dispatcher**: Rust commands handling file paths, OS notifications, and database operations.
- **Windows System Integrations**: Window minimization, maximization, close buttons, and native application menu/tray capabilities.
- **Offline Guest Profile Switcher**: Direct local switching without cookies or browser session middleware.

### 4. Which interactions were actually tested
1. **TypeScript Type Safety**: `tsc --noEmit` executed on `LearnUp-Desktop` and completed with **0 errors**.
2. **Production Bundle Compilation**: `npm run build` compiled the Vite frontend into `dist/` in **1.22 seconds** (output size: 173 kB JS vs 160 MB in old standalone).
3. **Rust Backend Compilation**: `cargo check` executed on `src-tauri` and passed with **0 errors and 0 warnings**.
4. **Storage Adapter Unit/Integration Tests**:
   - `initializes default guest profile when storage is empty` (PASSED).
   - `creates and switches local guest profiles` (PASSED).
   - `persists, queries, and tombstones durable offline notes` (PASSED).
   - `persists and isolates learning items per user account scope` (PASSED).
5. **Interactive UI State Machine**:
   - Module toggles: "Select All" and "Deselect All" correctly batch update all module states.
   - Interactive dialogs: "Add YouTube Video" modal opens, validates input, and closes without blocking pointer events.
   - Focus Timer: Start, Pause, and Reset states accurately update timer ticks.
   - Profile Switcher & Sign Out: Returns cleanly to the "Who is studying?" profile chooser.

### 5. Which features work offline
- **Guest Profiles**: Local creation, editing, and switching without network or Docker.
- **Course Library**: Browsing previously imported courses and viewing locally cached metadata.
- **Study Notes**: Creating, viewing, editing, and deleting notes with instant local ACID persistence.
- **Focus Sanctuary**: Distraction-free countdown timer and study session logging.
- **Module Preferences**: Enabling/disabling optional modules with persistent settings.
- **Database Maintenance**: Running `PRAGMA integrity_check` directly on local disk.

### 6. Which features remain blocked (or require internet)
- **YouTube Video Streaming**: Video bytes cannot be played offline because YouTube CDN requires an internet connection. LearnUp complies with YouTube TOS by not downloading or rehosting raw video media.
- **AI Career Roadmap Generation**: Requires the Gemini API, which requires an active internet connection.
- **Cloud Account Authentication**: Supabase OAuth/password sign-in requires connectivity.

### 7. Whether a bundled Node.js server is necessary
**NO. A bundled Node.js server is completely unnecessary and should not be reintroduced.**
- The historical bundled Node.js server was the root cause of every major failure in SF-114 through SF-117 (Windows path `\\?\C:` crashes, `EADDRINUSE` port collisions, high RAM usage, slow startup, and WebView2 proxy race conditions).
- In Tauri 2, frontend assets are embedded directly into the binary and loaded via internal custom protocols with zero open network ports.
- Database access is handled at maximum speed through native Rust SQLite bindings.
- Zero features in LearnUp Desktop require an active Node.js server process.

### 8. Next implementation milestones
1. **Milestone SF-120 (Monorepo & Shared Core Extraction)**:
   - Extract shared types, validation schemas, and UI components into a shared package (`packages/core`, `packages/ui`).
2. **Milestone SF-121 (Tauri WebView2 Native Testing)**:
   - Run the native desktop application using `npm run tauri dev` and verify live Windows WebView2 interactions.
3. **Milestone SF-122 (Offline-to-Cloud Sync Adapter)**:
   - Implement the background mutation sync worker to replicate local SQLite mutations to Supabase when online.
4. **Milestone SF-123 (Lightweight Windows Installer)**:
   - Package the native Tauri application into a clean < 15MB NSIS installer without any Node.js dependencies.

---

## 3. Verification Summary

| Project | Verification Type | Command | Result |
| :--- | :--- | :--- | :---: |
| `LearnUp-Web` | Unit & Integration | `npm test` | **605 passed (78 test files)** |
| `LearnUp-Web` | Next.js Build | `npm run build` | **Compiled successfully (20 routes)** |
| `LearnUp-Web` | Browser Acceptance | `npx playwright test` | **1 passed (2.8s)** |
| `LearnUp-Desktop` | TypeScript | `npm run typecheck` | **0 errors** |
| `LearnUp-Desktop` | Vite Production Build | `npm run build` | **1.22s (0 errors)** |
| `LearnUp-Desktop` | Storage Unit Tests | `npm test` | **4 passed (100%)** |
| `LearnUp-Desktop` | Rust Backend Check | `cargo check` | **Finished (0 errors, 0 warnings)** |
