# LearnUp — Web & Desktop Shared Code Architecture

## 1. Overview

To prevent code duplication while avoiding platform coupling, LearnUp establishes a strict boundary between:
1. **Shared Domain Core**
2. **Web-Specific Platform Code (`LearnUp-Web`)**
3. **Desktop-Specific Platform Code (`LearnUp-Desktop`)**

Neither platform directly imports the other's platform-specific entry points or proprietary runtimes.

---

## 2. Shared Code Matrix

| Component / Module | Shared Core | Web Implementation | Desktop Implementation |
| :--- | :---: | :--- | :--- |
| **Domain Models & Contracts** | **YES** | Reuses `contracts.ts` | Reuses `contracts.ts` |
| **Storage Contract (`IStorageAdapter`)** | **YES** | `SqliteStorageAdapter` / API Client | `TauriStorageAdapter` (IPC) |
| **Platform Abstraction (`IPlatformAdapter`)**| **YES** | Web Browser implementation | Tauri Native implementation |
| **YouTube URL Parser** | **YES** | `lib/youtube/url.ts` | `src/adapters/platform.ts` |
| **Module Preference Registry** | **YES** | `lib/modules/registry.ts` | `src/App.tsx` state machine |
| **Design Tokens & Theme** | **YES** | CSS Variables in globals.css | Shared theme variables in CSS |
| **Auth & Profile Chooser** | Logic shared | `components/auth/ProfileChooser.tsx` | Native SQLite Profile Manager |
| **Focus Session Logic** | Logic shared | Next.js API `/api/focus/session` | Native Pomodoro timer + SQLite |
| **Video Playback Component** | Logic shared | `components/player/YouTubePlayer.tsx` | WebView2 YouTube Embed Container |

---

## 3. Storage Boundary Abstraction

Both Web and Desktop adhere to `IStorageAdapter`:

```typescript
export interface IStorageAdapter {
  init(): Promise<void>;
  close(): Promise<void>;

  // Profiles
  listProfiles(): Promise<UserProfile[]>;
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  getActiveProfile(): Promise<UserProfile | null>;
  setActiveProfile(profileId: string): Promise<void>;

  // Notes
  getNote(userId: string, noteId: string): Promise<DurableNote | null>;
  listNotes(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableNote[]>;
  saveNote(note: DurableNote): Promise<DurableNote>;
  markNoteDeleted(userId: string, noteId: string): Promise<void>;

  // Bookmarks & Progress
  getProgress(userId: string, youtubeVideoId: string): Promise<DurableProgress | null>;
  saveProgress(progress: DurableProgress): Promise<DurableProgress>;

  // Learning Items
  listLearningItems(userId: string): Promise<LearningItem[]>;
  saveLearningItem(item: LearningItem): Promise<LearningItem>;
  deleteLearningItem(userId: string, itemId: string): Promise<void>;

  // Integrity & Maintenance
  purgeAccountData(userId: string): Promise<void>;
  runIntegrityCheck(): Promise<{ ok: boolean; issues: string[] }>;
}
```

### Implementations:
1. **Web (`LearnUp-Web`)**:
   - `HttpStorageAdapter`: Communicates with `/api/notes`, `/api/progress`, etc.
   - `BrowserLocalStorageAdapter`: Stores guest data in browser storage with cookie identifiers.
2. **Desktop (`LearnUp-Desktop`)**:
   - `TauriStorageAdapter`: Communicates via `invoke('db_save_note', ...)` directly with Rust and `rusqlite`.
   - `WebFallbackAdapter`: Uses `happy-dom` / `localStorage` for rapid Vitest unit and integration testing.

---

## 4. Platform Boundary Rules

1. **Rule 1: No Tauri in Web**:
   - `LearnUp-Web` must NEVER import `@tauri-apps/api`, invoke Tauri IPC commands, or reference Windows native APIs.
2. **Rule 2: No Node-only APIs in Desktop UI**:
   - The desktop frontend must never import `node:fs`, `node:sqlite`, or `node:child_process` in renderer code.
3. **Rule 3: Dependency Isolation**:
   - `LearnUp-Web` manages dependencies for Next.js, React DOM, and Supabase SSR.
   - `LearnUp-Desktop` manages dependencies for Vite, Tauri 2 CLI, and desktop plugins.
4. **Rule 4: Shared Packaging Roadmap**:
   - In Milestone SF-120+, shared code will be packaged into a clean monorepo or private workspace package:
     - `@learnup/core`: Types, validation schemas, utility functions.
     - `@learnup/ui`: Pure visual React components with zero platform baggage.
     - `@learnup/adapters`: Contract definitions and mock test adapters.
