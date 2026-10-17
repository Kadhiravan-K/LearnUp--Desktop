# LearnUp Desktop — Offline Storage & Synchronization Plan

## 1. Principles of Offline Operation

LearnUp Desktop is designed to be **offline-first**:
1. The application starts instantly and functions completely without Docker, background database containers, or active internet connectivity.
2. All user data generated during offline study (notes, bookmarks, timer sessions, module preferences, lecture progress) is committed immediately to native SQLite.
3. Network availability is treated as an optional enhancement for streaming external YouTube media and syncing with the cloud.

---

## 2. Capability Matrix: Offline vs Online

| Feature | Offline Behavior | Online Behavior | Notes / Constraints |
| :--- | :---: | :---: | :--- |
| **Guest Profile Creation & Switching** | **Full** | **Full** | Stored locally in SQLite `user_profiles`. |
| **Module Selection & Preferences** | **Full** | **Full** | Persisted across app restarts. |
| **Notes & Key Takeaways** | **Full** | **Full** | Instant local ACID writes with optimistic UI. |
| **Focus Sanctuary Timer** | **Full** | **Full** | Local state and timer ticks; no cloud latency. |
| **Course Library Browsing** | **Full** | **Full** | Cached metadata and thumbnails rendered from disk. |
| **YouTube Video Playback** | *Unavailable* | **Full** | LearnUp complies with YouTube TOS: video bytes are never downloaded or rehosted. Clear offline notice displayed. |
| **AI Career Roadmap Generation** | *Unavailable* | **Full** | Requires Gemini cloud API. Generates offline placeholder badge when disconnected. |
| **Cloud Multi-Device Sync** | *Queued* | **Active** | Mutations queued in SQLite `mutation_journal`. |

---

## 3. Database Specification (`learnup.db`)

### 3.1 Location
- Windows standard application data directory:
  `%LOCALAPPDATA%\com.learnup.desktop\learnup.db`
- Preserved across application upgrades and installer runs.

### 3.2 Pragmas
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

### 3.3 Core Tables
- `user_profiles`: Stores local guest and cloud-linked user profiles.
- `active_session`: Single-row table tracking the currently active local profile.
- `learning_items`: Stores imported YouTube courses, lectures, and playlist entries.
- `durable_notes`: Stores study notes, timestamps, edit versions, and sync statuses.
- `durable_bookmarks`: Stores video timestamp bookmarks with user annotations.
- `durable_progress`: Tracks video playback positions and completion indicators.
- `mutation_journal`: Logs every local change with incrementing version numbers for future 3-way cloud sync.

---

## 4. YouTube Streaming & WebView2 Strategy

1. **Embedding**:
   - The desktop video player embeds YouTube lectures using `https://www.youtube-nocookie.com/embed/{videoId}?enablejsapi=1`.
2. **Offline Guard**:
   - When offline, attempting to load a video displays a graceful offline banner:
     > *"You are currently offline. YouTube video streaming requires an internet connection. Your notes, bookmarks, and focus timer remain fully functional."*
3. **No Secret Leaks**:
   - The desktop client never embeds YouTube API keys or Supabase service-role keys. Public metadata is fetched via client-safe oEmbed or backend IPC without privileged credentials.
