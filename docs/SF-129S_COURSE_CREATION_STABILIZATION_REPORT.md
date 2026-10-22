# SF-129S — LearnUp-Desktop: Add Course UI Parity, YouTube Playlist Import & Mock Data Removal Report

**Milestone:** SF-129S  
**Target Release:** v0.2.0-beta.2  
**Repository:** LearnUp-Desktop (`C:\Users\kadhir\Projects\OpenSource\LearnUp-Desktop`)  
**Design Reference:** LearnUp-Web (`C:\Users\kadhir\Projects\OpenSource\LearnUp-Web`)  
**Status:** Completed & Verified  

---

## 1. Executive Summary

In milestone **SF-129S**, all user-reported blockers concerning course creation, YouTube playlist importing, and default mock data have been resolved:

1. **Add Course UI Parity Restored:** Replaced the incomplete, hardcoded single-input inline form in `src/App.tsx` with the complete 4-step `<AddCourseModal />` ported faithfully from LearnUp-Web.
2. **YouTube Playlist Ingestion Fully Functional:** Solved the YouTube playlist import failure by implementing zero-auth, zero-CORS YouTube Atom RSS feed fetching and XML parsing in both the Rust Tauri backend (`fetch_remote_text`, `get_youtube_meta_curl`) and the desktop TypeScript client (`parsePlaylistXmlFeed`, `DesktopImportService`).
3. **Mock and Hardcoded Sample Content Purged:** Removed legacy mock fallbacks (specifically Rick Astley `dQw4w9WgXcQ` references) from error fallbacks and roadmap templates, replacing them with valid educational links.
4. **Course Player Playlist Support Added:** Updated `src/views/PlayerView.tsx` with lesson list navigation (`Lessons (N)` tab), per-lesson thumbnail and progress tracking, and active video switching.
5. **Idempotent SQLite Migrations:** Safely extended the SQLite schema in `src-tauri/src/db.rs` with `description`, `skill_domain`, `tags`, and `videos_json` columns without touching or invalidating existing user data.
6. **Full Test & Build Verification:** 89 unit tests pass across 5 suites (`vitest`), TypeScript typecheck passes with 0 errors (`tsc --noEmit`), Vite production build completes cleanly, and Rust compiles with 0 errors (`cargo check`).
7. **Version Bump:** Bumped application version from `v0.2.0-beta.1` to `v0.2.0-beta.2` across `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.

---

## 2. Feature Comparison Matrix: LearnUp-Web vs LearnUp-Desktop

| Feature / Control | LearnUp-Web | Pre-SF-129S Desktop | SF-129S Desktop | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Add Course Modal Entry Point** | Header button + Library empty state | Simple inline prompt | Full `<AddCourseModal />` modal | Verified |
| **Course Creation Stepper** | 4-step wizard (Type, Input, Preview, Customize) | None (single input) | 4-step wizard with step navigation | Verified |
| **Source Type Selection** | Single Video vs YouTube Playlist cards | None | Single Video & Playlist selection cards | Verified |
| **Batch Multi-URL Import** | Textarea with multi-line extraction | Unsupported | Supported (`DesktopImportService.previewMultipleUrls`) | Verified |
| **YouTube Playlist Preview** | Live title, creator, video count, lesson list | Failed (Next.js `/api` 404) | Live native extraction via RSS/oEmbed | Verified |
| **Syllabus / Lesson Selection** | Checkboxes to include/exclude playlist lessons | None | Checkboxes with toggle all / toggle individual | Verified |
| **Metadata Customization** | Title, description, skill domain, tags, custom thumb | None | Title, description, skill domain, tags, thumb inputs | Verified |
| **Course Edit Functionality** | Modal with syllabus reordering / deletion | Incomplete mock | Real local SQLite updates (`EditCourseModal.tsx`) | Verified |
| **Playlist Lesson Navigation in Player** | Playlist drawer / tab | Only played single video ID | `Lessons (${N})` tab with active lesson selector | Verified |
| **Mock Video Fallbacks** | None | Rick Astley `dQw4w9WgXcQ` | Removed & replaced with real educational links | Verified |

---

## 3. YouTube Playlist Ingestion Architecture

### The Problem
LearnUp-Web relied on server-side Next.js route handlers (`/api/learning-items/preview`) to make outbound requests to YouTube. In LearnUp-Desktop:
1. There is no Next.js Node.js server running in production; all logic runs in the client webview or Tauri Rust process.
2. Web browsers block direct cross-origin HTTP calls to YouTube RSS feeds due to CORS headers.
3. YouTube Data API requires API keys with strict quotas, which must not be embedded in distributed client desktop binaries.

### The Solution
1. **Tauri Native Command (`fetch_remote_text`):**
   - Implemented in `src-tauri/src/lib.rs` using native Windows SChannel TLS via Windows `curl.exe`.
   - Completely bypasses browser CORS restrictions without requiring any third-party proxies or cloud servers.
2. **Atom RSS Feed Resolution:**
   - YouTube exposes public Atom RSS feeds for playlists: `https://www.youtube.com/feeds/videos.xml?playlist_id={PLAYLIST_ID}`.
   - `parsePlaylistXmlFeed()` in `src/lib/youtube/client.ts` parses the feed entries, extracting `yt:videoId`, title (decoding XML entities like `&amp;`), and thumbnail URLs.
3. **oEmbed Metadata Resolution:**
   - Video and playlist titles and authors are fetched via YouTube's public oEmbed endpoint (`https://www.youtube.com/oembed?url=...`).
   - The Rust backend executes oEmbed requests with native Windows TLS fallback if the webview request fails.
4. **Desktop Import Service:**
   - `src/lib/services/import-service.ts` provides `desktopImportService.previewUrl()`, `previewMultipleUrls()`, and `importCourse()`.
   - Directly persists courses to SQLite via `platform.storage.saveLearningItem()` and writes to the offline mutation journal for subsequent cloud sync.

---

## 4. SQLite Schema & Local Storage Migrations

In `src-tauri/src/db.rs`, idempotent non-destructive migrations ensure existing user learning items are preserved while enabling rich course metadata:

```sql
ALTER TABLE learning_items ADD COLUMN description TEXT;
ALTER TABLE learning_items ADD COLUMN skill_domain TEXT;
ALTER TABLE learning_items ADD COLUMN tags TEXT;
ALTER TABLE learning_items ADD COLUMN videos_json TEXT;
```

The `videos_json` column serializes the full playlist lesson array (lesson IDs, titles, thumbnails, durations, and order indices). When opening a course in `PlayerView.tsx`, the lessons are parsed from `videosJson` and rendered into the interactive lessons syllabus.

---

## 5. Verification & Quality Gates

### Unit Tests (`vitest run`)
- **Total Test Suites:** 5 passed
- **Total Tests:** 89 passed (0 failed)
- **New Test Suite:** `tests/course-import.test.ts` (5 tests covering Atom feed parsing, entity decoding, video/playlist previewing, and mutation journaling).

### Static Type Analysis (`tsc --noEmit`)
- Exited with code 0.
- All interfaces (`LearningItem`, `LogContext`, `EditCourseModalProps`) synchronized across `src/core/types` and `src/lib/types`.

### Rust Backend Check (`cargo check`)
- Compiled cleanly with exit code 0 in 2m 09s.

### Frontend Production Bundle (`npm run build`)
- Transformed 280 modules in 14.49s.
- Assets emitted cleanly into `dist/`.

---

## 6. Updated Version Manifest

| File | Old Version | New Version |
| :--- | :--- | :--- |
| `package.json` | `0.2.0-beta.1` | `0.2.0-beta.2` |
| `src-tauri/Cargo.toml` | `0.2.0-beta.1` | `0.2.0-beta.2` |
| `src-tauri/tauri.conf.json` | `0.2.0-beta.1` | `0.2.0-beta.2` |
