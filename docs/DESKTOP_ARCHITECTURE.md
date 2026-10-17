# LearnUp Desktop — Clean Architecture & Native Foundation

## 1. Executive Summary

LearnUp Desktop is a standalone, lightweight, native Windows desktop application built with **Tauri 2**, **Rust**, **TypeScript**, and **React**. It is architecturally decoupled from the web application (`LearnUp-Web`), sharing business models, contracts, and design tokens while executing on a clean native foundation.

This document formalizes the architectural separation between `LearnUp-Web` and `LearnUp-Desktop` and explains why the historical bundled Node.js server architecture has been retired in favor of native Tauri IPC and embedded SQLite.

---

## 2. Product Separation Model

```
                    ┌────────────────────────┐
                    │      SHARED CORE       │
                    │   Types & Contracts    │
                    │   Domain Logic & Rules │
                    │   Design Tokens & CSS  │
                    └───────────┬────────────┘
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│       LEARNUP-WEB       │           │     LEARNUP-DESKTOP     │
│   Next.js 14 App Router │           │   Tauri 2 + React SPA   │
│   Cloud PostgreSQL      │           │   Native Embedded SQLite│
│   Vercel / Edge Deploy  │           │   Windows WebView2 App  │
│   Supabase SSR Auth     │           │   Offline Guest Profiles│
└─────────────────────────┘           └─────────────────────────┘
```

### The Three Tiers

1. **LearnUp-Web (`C:\Users\kadhir\Projects\OpenSource\LearnUp-Web`)**
   - The primary, web-first application.
   - Powered by Next.js 14 App Router and Supabase cloud infrastructure.
   - Verified with 78 test files, 605 unit/integration tests, and real browser Playwright suites.
   - Deployed to standard web hosting with zero native desktop dependencies.

2. **LearnUp-Desktop (`C:\Users\kadhir\Projects\OpenSource\LearnUp-Desktop`)**
   - Pure native Windows application powered by Tauri 2.
   - Fast, client-side React UI communicating via typed Tauri IPC commands to Rust.
   - Local-first, offline-first: stores all profiles, courses, notes, and study progress in a local ACID SQLite database (`learnup.db`).
   - Zero open localhost ports, zero background Node.js processes, zero Docker requirements.

3. **Shared Core**
   - Standard domain contracts (`DurableNote`, `DurableProgress`, `LearningItem`, `UserProfile`).
   - `IStorageAdapter` and `IPlatformAdapter` interface contracts.
   - Validation schemas (Zod) and URL parsing logic.

---

## 3. Evaluation: Why the Bundled Node.js Server Was Retired

In milestones SF-114 through SF-117, the desktop application attempted to bundle a complete Next.js standalone runtime with Node.js inside the desktop package. Real-world testing revealed fatal flaws:

| Problem Area | Bundled Node.js Standalone Approach | Clean Native Tauri 2 Architecture |
| :--- | :--- | :--- |
| **Port Conflicts** | Crashes with `EADDRINUSE` if port 3000 is occupied or if multiple app instances launch. | **Zero ports used.** Frontend assets are embedded directly into the binary and served via `tauri://localhost`. |
| **Path Normalization** | Windows extended verbatim paths (`\\?\C:\...`) crashed Next.js standalone with `EISDIR: lstat 'C:'`. | **Native Windows paths** handled cleanly by Rust's `std::path::PathBuf` and `rusqlite`. |
| **Resource Overhead** | Required 3 concurrent runtimes: `app.exe` + `node.exe` (150MB+ RAM) + WebView2 processes. | **Single native process** (`app.exe` + WebView2), consuming under 40MB idle RAM. |
| **Installer Size** | > 160 MB uncompressed (Node.js binary + Next.js server + node_modules). | **< 15 MB uncompressed** (compact native Rust binary and minified static assets). |
| **Startup Latency** | 2.5s to 6.0s while spawning child Node process, polling health endpoint, and initializing proxy. | **Instant (< 250ms)** direct native window initialization. |
| **Hydration Failures** | Race conditions between WebView2 DOM ready and Node.js HTTP listener readiness caused blank screens. | **Deterministic rendering**: assets load synchronously from embedded bundle. |

**Verdict:** Bundling a Node.js server inside a desktop application is unnecessary and harmful when the application does not require server-side rendering or edge runtime capabilities. A static client-side frontend paired with native Rust IPC commands is vastly superior for performance, reliability, and security.

---

## 4. Desktop Subsystem Architecture

### 4.1 Native Storage Layer (`src-tauri/src/db.rs`)
- Implemented with `rusqlite` using the `bundled` SQLite 3.45+ engine.
- Located in `%LOCALAPPDATA%\com.learnup.desktop\learnup.db`.
- Configured with high-concurrency pragmas:
  - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging enables non-blocking reads during writes).
  - `PRAGMA synchronous = NORMAL;` (Safe ACID persistence without fsync bottlenecks).
  - `PRAGMA foreign_keys = ON;` (Strict referential integrity).
  - `PRAGMA busy_timeout = 5000;` (Handles concurrent transactions without immediate lock errors).

### 4.2 Native IPC Bridge (`src-tauri/src/lib.rs`)
- Exposes typed Tauri commands using `#[tauri::command]`:
  - `db_init`, `db_list_profiles`, `db_save_profile`, `db_set_active_profile`
  - `db_list_learning_items`, `db_save_learning_item`, `db_delete_learning_item`
  - `db_list_notes`, `db_save_note`, `db_delete_note`
  - `db_integrity_check`
  - `check_online_status`
  - `fetch_youtube_metadata`
- Commands execute on a dedicated thread pool, guaranteeing that database queries never block the WebView2 UI thread.

### 4.3 Platform Adapter (`src/adapters/platform.ts`)
- Implements `IPlatformAdapter` with runtime environment detection:
  - Inside Tauri (`window.__TAURI_INTERNALS__` present): delegates to `TauriStorageAdapter` via IPC.
  - In web browsers / test environments: delegates to `WebFallbackAdapter` using LocalStorage / IndexedDB.
- Guarantees 100% testability with Vitest and Playwright without requiring a live Tauri build.

---

## 5. Security & Isolation

1. **Zero Privileged Secrets**:
   - The desktop client never contains Supabase service-role keys or privileged credentials.
2. **Strict Content Security Policy (CSP)**:
   - Configured in `tauri.conf.json` to allow YouTube embed frames (`https://www.youtube.com`, `https://www.youtube-nocookie.com`) while disallowing untrusted third-party scripts.
3. **No Dynamic Code Evaluation**:
   - UI assets are pre-compiled and hash-verified at build time.
