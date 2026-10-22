# LearnUp Desktop — Agent Guidelines

These guidelines apply to all autonomous and assistant AI coding agents working on **LearnUp-Desktop**.

## Core Directives

1. **Inspect Repository State First**
   - Always run `git status`, verify current branch, latest commits, and tags before taking action.
   - Inspect existing implementation code and configuration (`package.json`, `tauri.conf.json`, `Cargo.toml`).
   - Read prior milestone reports in `docs/` before making assumptions.

2. **Preserve Architecture & Principles**
   - LearnUp Desktop is a **native Windows desktop application** built on Tauri 2, Rust, React, TypeScript, Vite, SQLite, and WebView2.
   - The architecture is strictly **local-first and offline-first**. Never reintroduce a bundled Node.js/Next.js desktop-server architecture.
   - Follow the established layer hierarchy: `React UI → Core/domain layer → Adapters → Tauri IPC → Rust → SQLite`.

3. **Protect User Learning Data**
   - User learning data is stored locally in SQLite (`%APPDATA%\learnup.db`).
   - Never write destructive migrations or reset the database. Migrations must be idempotent, non-destructive, and forward-safe.
   - Never run destructive Git commands (`git reset --hard`, `git clean -fd`, `git checkout -- .`) without explicit user authorization.

4. **Never Simulate Fake Cloud or Backend Functionality**
   - Clearly distinguish between local SQLite functionality, offline cache, and remote cloud capabilities.
   - Do not replace real network interactions with fake `setTimeout` success responses or hardcoded credentials.

5. **Test Before Claiming Completion**
   - Every completed increment must pass the repository quality gate:
     - `npm run typecheck`
     - `npm test`
     - `npm run build`
     - `cd src-tauri && cargo check && cd ..`
   - Never claim tests or native acceptance passed unless they were actually executed and observed.

6. **Maintain Engineering Documentation**
   - Record root causes, fixes, test evidence, and remaining blockers in `docs/SF-13X_<TOPIC>_REPORT.md` following established conventions.
   - Preserve existing documentation as historical evidence.
