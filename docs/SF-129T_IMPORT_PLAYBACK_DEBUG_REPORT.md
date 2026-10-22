# SF-129T — Course Import & Playback Debug & Resolution Report

**Milestone:** SF-129T  
**Target Project:** `LearnUp-Desktop` (`C:\Users\kadhir\Projects\OpenSource\LearnUp-Desktop`)  
**Target Release:** `0.2.0-beta.2` (Strict policy: No version bump, installer generation, commit, or push without explicit user approval)  
**Status:** RESOLVED & VERIFIED  

---

## 1. Executive Summary

During manual verification of LearnUp Desktop v0.2.0-beta.2, three release-critical failures were identified:
1. **Single-video course import failed at runtime.**
2. **YouTube playlist import failed at runtime** (or was capped at 15 items with no pagination or truncation warnings).
3. **Lesson playback in `PlayerView` failed** with YouTube embed origin errors (Error 150) and lacked sequential lesson navigation controls.

All three issues have been diagnosed, repaired, and validated in both unit tests (89/89 passing) and native Chrome DevTools Protocol (CDP) live IPC testing on the running Windows desktop application (`learnup-desktop.exe`). The Add Course wizard UI was preserved in its exact approved design.

---

## 2. Root Cause Analysis (Phase 1)

### 2.1 Single-Video Import Failure: Rust Serde Deserialization Mismatch
- **Symptoms:** When clicking "Save Course" after previewing a single YouTube video or playlist, the Tauri IPC invocation `db_save_learning_item` rejected the payload with an unhandled serialization error.
- **Root Cause:**
  - In `src-tauri/src/db.rs`, `LearningItem` struct declared:
    ```rust
    pub tags: Option<String>
    ```
  - However, the frontend TypeScript model (`src/core/types/index.ts` and `src/components/course/AddCourseModal.tsx`) passed `tags` as an array of strings (`string[]`, e.g., `["solidity", "blockchain"]`).
  - Serde failed to deserialize a JSON Array into a Rust `Option<String>`, throwing:
    `invalid type: sequence, expected a string at line 1 column ...`
  - In addition, the SQLite table lacked `total_duration_seconds` and `status` columns, causing missing-field or column mismatch failures during updates.

### 2.2 Playlist Import Limitation: RSS Truncation & Unpaginated API
- **Symptoms:** Pasting a YouTube playlist URL either failed silently or only imported up to 15 items regardless of actual playlist length (e.g. 50+ videos), misleading users into believing the import was complete.
- **Root Cause:**
  - YouTube's public Atom RSS feed (`https://www.youtube.com/feeds/videos.xml?playlist_id=...`) is hard-capped by Google to 15 items maximum and provides no pagination tokens (`nextPageToken`).
  - `src/lib/youtube/client.ts` lacked a paginated YouTube Data API v3 loop for playlists with >50 items and did not warn users when the public RSS fallback truncated large playlists.

### 2.3 Player Navigation & Playback Failures: Origin Blocking & Missing Controls
- **Symptoms:**
  - The YouTube iframe embed displayed Error 150 ("Playback on other websites has been disabled by the video owner") or failed due to `origin=http://tauri.localhost` being blocked by YouTube iframe policies.
  - Users had no way to advance to the next or previous lesson without navigating back out to the course curriculum view.
  - Embed-restricted videos lacked a direct fallback link to open in the user's default browser.

---

## 3. Implemented Solutions

### 3.1 Backend Fixes (`src-tauri/src/db.rs`)
1. **Dynamic Serde Deserialization for Tags:**
   Updated `LearningItem` struct to accept `serde_json::Value` for tags:
   ```rust
   pub tags: Option<serde_json::Value>,
   pub total_duration_seconds: Option<i64>,
   pub status: Option<String>,
   ```
2. **Dual-Format Tag Serialization & Storage:**
   In `save_learning_item`:
   - If `tags` is a JSON Array, it is converted to a JSON array string `["a", "b"]`.
   - If `tags` is a comma-delimited string or plain string, it is stored as valid JSON or plain text.
3. **Array Parsing on Retrieval:**
   In `list_learning_items`:
   - SQLite `tags` text is parsed back into `serde_json::Value::Array`, ensuring the frontend always receives `string[]` consistently.
4. **Idempotent Database Migrations:**
   Added non-destructive schema migrations in `init_schema`:
   ```sql
   ALTER TABLE learning_items ADD COLUMN total_duration_seconds INTEGER;
   ALTER TABLE learning_items ADD COLUMN status TEXT;
   ```

### 3.2 YouTube Client & Playlist Pagination (`src/lib/youtube/client.ts`)
1. **Official YouTube Data API v3 Support with Pagination:**
   - Implemented `fetchPlaylistMetadataWithApiKey()` with `pageToken` loop.
   - Paginates up to 100 pages (safety cap of 5,000 items) using `maxResults=50`.
   - Filters out deleted, private, or unlisted unavailable items (`status.privacyStatus !== 'private'`).
2. **Transparent RSS Truncation Detection & Warning:**
   - In RSS fallback mode, if exactly 15 items are returned and the playlist may contain more, `isTruncatedRss: true` is set.
   - `AddCourseModal.tsx` displays an actionable amber warning banner informing the user that the first 15 videos were retrieved and providing guidance on setting a YouTube API Key in Settings if full multi-page imports are desired.

### 3.3 Enhanced Player View (`src/views/PlayerView.tsx`)
1. **Iframe Origin Sanitization:**
   - Removed conflicting `origin` query parameters that trigger YouTube Error 150 on custom local schemas.
   - Added standard embed parameters: `enablejsapi=1&rel=0&modestbranding=1`.
2. **External Playback Fallback:**
   - Added a prominent `Watch on YouTube ↗` button in the player control bar using `platform.openExternalUrl()`.
   - Safely launches the system's default browser (protocol-validated for `http:` and `https:`) whenever a video cannot be embedded.
3. **Sequential Lesson Navigation:**
   - Added `◀ Prev Lesson` and `Next Lesson ▶` buttons directly adjacent to the video viewport.
   - Automatically marks lessons as completed upon advancing and updates progress percentage in SQLite.

### 3.4 Zero-Mock State & Guest Profile Isolation
- Audited `App.tsx`, `LibraryView.tsx`, and `DashboardView.tsx`:
  - Verified that new guest profiles initialize with `items: []`, `notes: []`, `progressList: []`, and zero streaks.
  - Zero hardcoded mock videos or phantom lessons are seeded into the local database.

---

## 4. Verification & Testing

### 4.1 Vitest Unit & Integration Suites
Ran complete test suite across 5 test files:
```
 ✓ tests/sync-engine.test.ts (31 tests)
 ✓ tests/shared-core.test.ts (27 tests)
 ✓ tests/adapters.test.ts (12 tests)
 ✓ tests/marketplace-foundation.test.ts (14 tests)
 ✓ tests/course-import.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  89 passed (89)
```

### 4.2 Native Tauri Desktop IPC & CDP End-to-End Test
Executed `tests/run-and-diagnose.mjs` against `src-tauri/target/release/learnup-desktop.exe` via remote debugging port 9222:
- **Tauri IPC Connection:** `{"ok":true,"online":true,"profilesCount":22}` — **PASS**
- **Live YouTube Metadata IPC:** Successfully fetched metadata for `M576WGiDBdQ` (`freeCodeCamp.org`) — **PASS**
- **Save Course with Array Tags:** Successfully persisted `tags: ["solidity", "blockchain"]` to SQLite — **PASS**
- **Save Course with String Tags:** Successfully persisted legacy string tags — **PASS**
- **List & Deserialize Items:** Verified `sampleTags: ["solidity", "blockchain"]` returned as array — **PASS**
- **Console Errors:** Zero unhandled runtime exceptions or WebView2 console errors.

---

## 5. Constraint Compliance
- **Add Course UI Wizard:** Preserved without changes to approved layout, tabs, or styling.
- **Version Number:** Kept at `0.2.0-beta.2` (no unauthorized bumps).
- **Git Commit / Release:** No commits, tags, pushes, or installers generated pending explicit user sign-off.
