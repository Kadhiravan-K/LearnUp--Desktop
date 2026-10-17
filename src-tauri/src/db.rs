use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub color: String,
    pub initials: String,
    #[serde(rename = "lockType")]
    pub lock_type: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "isGuest")]
    pub is_guest: bool,
    #[serde(rename = "cloudUserId", default)]
    pub cloud_user_id: Option<String>,
    #[serde(rename = "cloudUserEmail", default)]
    pub cloud_user_email: Option<String>,
    #[serde(rename = "cloudSyncEnabled", default)]
    pub cloud_sync_enabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MutationJournalEntry {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "cloudUserId", default)]
    pub cloud_user_id: Option<String>,
    #[serde(rename = "entityType")]
    pub entity_type: String,
    #[serde(rename = "entityId")]
    pub entity_id: String,
    pub operation: String,
    #[serde(rename = "baseVersion")]
    pub base_version: i64,
    #[serde(rename = "localVersion")]
    pub local_version: i64,
    pub payload: serde_json::Value,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "retryCount", default)]
    pub retry_count: i64,
    pub status: String,
    #[serde(rename = "errorMessage", default)]
    pub error_message: Option<String>,
    #[serde(rename = "errorCategory", default)]
    pub error_category: Option<String>,
    #[serde(rename = "lastAttemptAt", default)]
    pub last_attempt_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LearningItem {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub title: String,
    #[serde(rename = "sourceType")]
    pub source_type: String,
    #[serde(rename = "sourceId")]
    pub source_id: String,
    #[serde(rename = "thumbnailUrl")]
    pub thumbnail_url: String,
    #[serde(rename = "channelTitle")]
    pub channel_title: Option<String>,
    #[serde(rename = "itemCount")]
    pub item_count: Option<i64>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DurableNote {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "learningItemId")]
    pub learning_item_id: String,
    #[serde(rename = "youtubeVideoId")]
    pub youtube_video_id: String,
    pub content: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub version: i64,
    #[serde(rename = "syncStatus")]
    pub sync_status: String,
    #[serde(rename = "isDeleted")]
    pub is_deleted: bool,
    #[serde(rename = "tombstoneAt")]
    pub tombstone_at: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FocusSessionRecord {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "durationSeconds")]
    pub duration_seconds: i64,
    pub mode: String,
    pub completed: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DurableBookmark {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "learningItemId")]
    pub learning_item_id: String,
    #[serde(rename = "youtubeVideoId")]
    pub youtube_video_id: String,
    #[serde(rename = "positionSeconds")]
    pub position_seconds: f64,
    pub label: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub version: i64,
    #[serde(rename = "syncStatus")]
    pub sync_status: String,
    #[serde(rename = "isDeleted")]
    pub is_deleted: bool,
    #[serde(rename = "tombstoneAt")]
    pub tombstone_at: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DurableProgress {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "youtubeVideoId")]
    pub youtube_video_id: String,
    #[serde(rename = "positionSeconds")]
    pub position_seconds: f64,
    #[serde(rename = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[serde(rename = "isCompleted")]
    pub is_completed: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub version: i64,
    #[serde(rename = "syncStatus")]
    pub sync_status: String,
    #[serde(rename = "isDeleted")]
    pub is_deleted: bool,
    #[serde(rename = "tombstoneAt")]
    pub tombstone_at: Option<String>,
}

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)?;

        // Pragmas for ACID speed and concurrency
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             PRAGMA busy_timeout = 5000;",
        )?;

        let mgr = Self {
            conn: Mutex::new(conn),
        };
        mgr.init_schema()?;
        Ok(mgr)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                color TEXT NOT NULL,
                initials TEXT NOT NULL,
                lock_type TEXT NOT NULL DEFAULT 'none',
                updated_at TEXT NOT NULL,
                is_guest INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS active_session (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                active_profile_id TEXT,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS learning_items (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                thumbnail_url TEXT NOT NULL,
                channel_title TEXT,
                item_count INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS durable_notes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                learning_item_id TEXT NOT NULL,
                youtube_video_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                sync_status TEXT NOT NULL DEFAULT 'saved_locally',
                is_deleted INTEGER NOT NULL DEFAULT 0,
                tombstone_at TEXT
            );

            CREATE TABLE IF NOT EXISTS durable_bookmarks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                learning_item_id TEXT NOT NULL,
                youtube_video_id TEXT NOT NULL,
                position_seconds REAL NOT NULL,
                label TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                sync_status TEXT NOT NULL DEFAULT 'saved_locally',
                is_deleted INTEGER NOT NULL DEFAULT 0,
                tombstone_at TEXT
            );

            CREATE TABLE IF NOT EXISTS durable_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                youtube_video_id TEXT NOT NULL,
                position_seconds REAL NOT NULL,
                duration_seconds REAL,
                is_completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                sync_status TEXT NOT NULL DEFAULT 'saved_locally',
                is_deleted INTEGER NOT NULL DEFAULT 0,
                tombstone_at TEXT,
                UNIQUE(user_id, youtube_video_id)
            );

            CREATE TABLE IF NOT EXISTS mutation_journal (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                cloud_user_id TEXT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                base_version INTEGER NOT NULL,
                local_version INTEGER NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                error_message TEXT,
                error_category TEXT,
                last_attempt_at TEXT
            );

            CREATE TABLE IF NOT EXISTS focus_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                mode TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS roadmap_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                roadmap_id TEXT NOT NULL,
                milestone_id TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 1,
                completed_at TEXT NOT NULL,
                UNIQUE(user_id, roadmap_id, milestone_id)
            );",
        )?;

        // Non-destructive idempotent migrations for schema upgrades
        let _ = conn.execute("ALTER TABLE mutation_journal ADD COLUMN cloud_user_id TEXT;", []);
        let _ = conn.execute("ALTER TABLE mutation_journal ADD COLUMN error_category TEXT;", []);
        let _ = conn.execute("ALTER TABLE user_profiles ADD COLUMN cloud_user_id TEXT;", []);
        let _ = conn.execute("ALTER TABLE user_profiles ADD COLUMN cloud_user_email TEXT;", []);
        let _ = conn.execute("ALTER TABLE user_profiles ADD COLUMN cloud_sync_enabled INTEGER NOT NULL DEFAULT 0;", []);
        let _ = conn.execute("ALTER TABLE durable_notes ADD COLUMN title TEXT;", []);
        let _ = conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_items_user_source ON learning_items (user_id, source_id);", []);

        Ok(())
    }

    // Profiles
    pub fn list_profiles(&self) -> Result<Vec<UserProfile>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, email, color, initials, lock_type, updated_at, is_guest, cloud_user_id, cloud_user_email, cloud_sync_enabled 
             FROM user_profiles ORDER BY updated_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            let sync_enabled: Option<i64> = row.get(10)?;
            Ok(UserProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                color: row.get(3)?,
                initials: row.get(4)?,
                lock_type: row.get(5)?,
                updated_at: row.get(6)?,
                is_guest: row.get::<_, i64>(7)? != 0,
                cloud_user_id: row.get(8)?,
                cloud_user_email: row.get(9)?,
                cloud_sync_enabled: sync_enabled.map(|v| v != 0),
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_profile(&self, p: &UserProfile) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO user_profiles (id, name, email, color, initials, lock_type, updated_at, is_guest, cloud_user_id, cloud_user_email, cloud_sync_enabled)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                email = excluded.email,
                color = excluded.color,
                initials = excluded.initials,
                lock_type = excluded.lock_type,
                updated_at = excluded.updated_at,
                is_guest = excluded.is_guest,
                cloud_user_id = excluded.cloud_user_id,
                cloud_user_email = excluded.cloud_user_email,
                cloud_sync_enabled = excluded.cloud_sync_enabled",
            params![
                p.id,
                p.name,
                p.email,
                p.color,
                p.initials,
                p.lock_type,
                p.updated_at,
                if p.is_guest { 1 } else { 0 },
                p.cloud_user_id,
                p.cloud_user_email,
                if p.cloud_sync_enabled.unwrap_or(false) { 1 } else { 0 }
            ],
        )?;
        Ok(())
    }

    pub fn get_active_profile(&self) -> Result<Option<UserProfile>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT active_profile_id FROM active_session WHERE id = 1")?;
        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            let pid: Option<String> = row.get(0)?;
            if let Some(id) = pid {
                drop(rows);
                drop(stmt);
                let mut p_stmt = conn.prepare(
                    "SELECT id, name, email, color, initials, lock_type, updated_at, is_guest, cloud_user_id, cloud_user_email, cloud_sync_enabled 
                     FROM user_profiles WHERE id = ?1"
                )?;
                let mut p_rows = p_stmt.query([&id])?;
                if let Some(p_row) = p_rows.next()? {
                    let sync_enabled: Option<i64> = p_row.get(10)?;
                    return Ok(Some(UserProfile {
                        id: p_row.get(0)?,
                        name: p_row.get(1)?,
                        email: p_row.get(2)?,
                        color: p_row.get(3)?,
                        initials: p_row.get(4)?,
                        lock_type: p_row.get(5)?,
                        updated_at: p_row.get(6)?,
                        is_guest: p_row.get::<_, i64>(7)? != 0,
                        cloud_user_id: p_row.get(8)?,
                        cloud_user_email: p_row.get(9)?,
                        cloud_sync_enabled: sync_enabled.map(|v| v != 0),
                    }));
                }
            }
        }
        Ok(None)
    }

    pub fn set_active_profile(&self, profile_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono_now();
        conn.execute(
            "INSERT INTO active_session (id, active_profile_id, updated_at)
             VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET
                active_profile_id = excluded.active_profile_id,
                updated_at = excluded.updated_at",
            params![profile_id, now],
        )?;
        Ok(())
    }

    // Learning Items
    pub fn list_learning_items(&self, user_id: &str) -> Result<Vec<LearningItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, user_id, title, source_type, source_id, thumbnail_url, channel_title, item_count, created_at, updated_at FROM learning_items WHERE user_id = ?1 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([user_id], |row| {
            Ok(LearningItem {
                id: row.get(0)?,
                user_id: row.get(1)?,
                title: row.get(2)?,
                source_type: row.get(3)?,
                source_id: row.get(4)?,
                thumbnail_url: row.get(5)?,
                channel_title: row.get(6)?,
                item_count: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_learning_item(&self, item: &LearningItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO learning_items (id, user_id, title, source_type, source_id, thumbnail_url, channel_title, item_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                source_type = excluded.source_type,
                source_id = excluded.source_id,
                thumbnail_url = excluded.thumbnail_url,
                channel_title = excluded.channel_title,
                item_count = excluded.item_count,
                updated_at = excluded.updated_at",
            params![
                item.id,
                item.user_id,
                item.title,
                item.source_type,
                item.source_id,
                item.thumbnail_url,
                item.channel_title,
                item.item_count,
                item.created_at,
                item.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_learning_item(&self, user_id: &str, item_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM learning_items WHERE user_id = ?1 AND id = ?2",
            params![user_id, item_id],
        )?;
        Ok(())
    }

    // Notes
    pub fn list_notes(&self, user_id: &str) -> Result<Vec<DurableNote>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, user_id, learning_item_id, youtube_video_id, content, created_at, updated_at, version, sync_status, is_deleted, tombstone_at, title FROM durable_notes WHERE user_id = ?1 AND is_deleted = 0 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([user_id], |row| {
            Ok(DurableNote {
                id: row.get(0)?,
                user_id: row.get(1)?,
                learning_item_id: row.get(2)?,
                youtube_video_id: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                version: row.get(7)?,
                sync_status: row.get(8)?,
                is_deleted: row.get::<_, i64>(9)? != 0,
                tombstone_at: row.get(10)?,
                title: row.get(11)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_note(&self, note: &DurableNote) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO durable_notes (id, user_id, learning_item_id, youtube_video_id, content, created_at, updated_at, version, sync_status, is_deleted, tombstone_at, title)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET
                content = excluded.content,
                updated_at = excluded.updated_at,
                version = excluded.version + 1,
                sync_status = excluded.sync_status,
                is_deleted = excluded.is_deleted,
                tombstone_at = excluded.tombstone_at,
                title = excluded.title",
            params![
                note.id,
                note.user_id,
                note.learning_item_id,
                note.youtube_video_id,
                note.content,
                note.created_at,
                note.updated_at,
                note.version,
                note.sync_status,
                if note.is_deleted { 1 } else { 0 },
                note.tombstone_at,
                note.title
            ],
        )?;
        Ok(())
    }

    pub fn delete_note(&self, user_id: &str, note_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono_now();
        conn.execute(
            "UPDATE durable_notes SET is_deleted = 1, tombstone_at = ?3 WHERE user_id = ?1 AND id = ?2",
            params![user_id, note_id, now],
        )?;
        Ok(())
    }

    pub fn get_note(&self, user_id: &str, note_id: &str) -> Result<Option<DurableNote>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, user_id, learning_item_id, youtube_video_id, content, created_at, updated_at, version, sync_status, is_deleted, tombstone_at, title FROM durable_notes WHERE user_id = ?1 AND id = ?2 AND is_deleted = 0")?;
        let mut rows = stmt.query([user_id, note_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(DurableNote {
                id: row.get(0)?,
                user_id: row.get(1)?,
                learning_item_id: row.get(2)?,
                youtube_video_id: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                version: row.get(7)?,
                sync_status: row.get(8)?,
                is_deleted: row.get::<_, i64>(9)? != 0,
                tombstone_at: row.get(10)?,
                title: row.get(11)?,
            }))
        } else {
            Ok(None)
        }
    }

    // Bookmarks
    pub fn get_bookmark(&self, user_id: &str, bookmark_id: &str) -> Result<Option<DurableBookmark>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, user_id, learning_item_id, youtube_video_id, position_seconds, label, created_at, updated_at, version, sync_status, is_deleted, tombstone_at FROM durable_bookmarks WHERE user_id = ?1 AND id = ?2 AND is_deleted = 0")?;
        let mut rows = stmt.query([user_id, bookmark_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(DurableBookmark {
                id: row.get(0)?,
                user_id: row.get(1)?,
                learning_item_id: row.get(2)?,
                youtube_video_id: row.get(3)?,
                position_seconds: row.get(4)?,
                label: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                version: row.get(8)?,
                sync_status: row.get(9)?,
                is_deleted: row.get::<_, i64>(10)? != 0,
                tombstone_at: row.get(11)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list_bookmarks(&self, user_id: &str) -> Result<Vec<DurableBookmark>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, user_id, learning_item_id, youtube_video_id, position_seconds, label, created_at, updated_at, version, sync_status, is_deleted, tombstone_at FROM durable_bookmarks WHERE user_id = ?1 AND is_deleted = 0 ORDER BY created_at DESC")?;
        let rows = stmt.query_map([user_id], |row| {
            Ok(DurableBookmark {
                id: row.get(0)?,
                user_id: row.get(1)?,
                learning_item_id: row.get(2)?,
                youtube_video_id: row.get(3)?,
                position_seconds: row.get(4)?,
                label: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                version: row.get(8)?,
                sync_status: row.get(9)?,
                is_deleted: row.get::<_, i64>(10)? != 0,
                tombstone_at: row.get(11)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_bookmark(&self, b: &DurableBookmark) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO durable_bookmarks (id, user_id, learning_item_id, youtube_video_id, position_seconds, label, created_at, updated_at, version, sync_status, is_deleted, tombstone_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET
                position_seconds = excluded.position_seconds,
                label = excluded.label,
                updated_at = excluded.updated_at,
                version = excluded.version + 1,
                sync_status = excluded.sync_status,
                is_deleted = excluded.is_deleted,
                tombstone_at = excluded.tombstone_at",
            params![
                b.id,
                b.user_id,
                b.learning_item_id,
                b.youtube_video_id,
                b.position_seconds,
                b.label,
                b.created_at,
                b.updated_at,
                b.version,
                b.sync_status,
                if b.is_deleted { 1 } else { 0 },
                b.tombstone_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_bookmark(&self, user_id: &str, bookmark_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono_now();
        conn.execute(
            "UPDATE durable_bookmarks SET is_deleted = 1, tombstone_at = ?3 WHERE user_id = ?1 AND id = ?2",
            params![user_id, bookmark_id, now],
        )?;
        Ok(())
    }

    // Progress
    pub fn get_progress(&self, user_id: &str, youtube_video_id: &str) -> Result<Option<DurableProgress>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, user_id, youtube_video_id, position_seconds, duration_seconds, is_completed, created_at, updated_at, version, sync_status, is_deleted, tombstone_at FROM durable_progress WHERE user_id = ?1 AND youtube_video_id = ?2")?;
        let mut rows = stmt.query([user_id, youtube_video_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(DurableProgress {
                id: row.get(0)?,
                user_id: row.get(1)?,
                youtube_video_id: row.get(2)?,
                position_seconds: row.get(3)?,
                duration_seconds: row.get(4)?,
                is_completed: row.get::<_, i64>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                version: row.get(8)?,
                sync_status: row.get(9)?,
                is_deleted: row.get::<_, i64>(10)? != 0,
                tombstone_at: row.get(11)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list_progress(&self, user_id: &str) -> Result<Vec<DurableProgress>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, user_id, youtube_video_id, position_seconds, duration_seconds, is_completed, created_at, updated_at, version, sync_status, is_deleted, tombstone_at FROM durable_progress WHERE user_id = ?1")?;
        let rows = stmt.query_map([user_id], |row| {
            Ok(DurableProgress {
                id: row.get(0)?,
                user_id: row.get(1)?,
                youtube_video_id: row.get(2)?,
                position_seconds: row.get(3)?,
                duration_seconds: row.get(4)?,
                is_completed: row.get::<_, i64>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                version: row.get(8)?,
                sync_status: row.get(9)?,
                is_deleted: row.get::<_, i64>(10)? != 0,
                tombstone_at: row.get(11)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_progress(&self, p: &DurableProgress) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO durable_progress (id, user_id, youtube_video_id, position_seconds, duration_seconds, is_completed, created_at, updated_at, version, sync_status, is_deleted, tombstone_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(user_id, youtube_video_id) DO UPDATE SET
                position_seconds = excluded.position_seconds,
                duration_seconds = excluded.duration_seconds,
                is_completed = excluded.is_completed,
                updated_at = excluded.updated_at,
                version = excluded.version + 1,
                sync_status = excluded.sync_status,
                is_deleted = excluded.is_deleted,
                tombstone_at = excluded.tombstone_at",
            params![
                p.id,
                p.user_id,
                p.youtube_video_id,
                p.position_seconds,
                p.duration_seconds,
                if p.is_completed { 1 } else { 0 },
                p.created_at,
                p.updated_at,
                p.version,
                p.sync_status,
                if p.is_deleted { 1 } else { 0 },
                p.tombstone_at,
            ],
        )?;
        Ok(())
    }

    // Mutation Journal
    pub fn append_mutation(&self, m: &MutationJournalEntry) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let payload_str = serde_json::to_string(&m.payload).unwrap_or_else(|_| "{}".to_string());
        conn.execute(
            "INSERT INTO mutation_journal (id, user_id, cloud_user_id, entity_type, entity_id, operation, base_version, local_version, payload_json, created_at, retry_count, status, error_message, error_category, last_attempt_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
             ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                retry_count = excluded.retry_count,
                error_message = excluded.error_message,
                error_category = excluded.error_category,
                last_attempt_at = excluded.last_attempt_at",
            params![
                m.id,
                m.user_id,
                m.cloud_user_id,
                m.entity_type,
                m.entity_id,
                m.operation,
                m.base_version,
                m.local_version,
                payload_str,
                m.created_at,
                m.retry_count,
                m.status,
                m.error_message,
                m.error_category,
                m.last_attempt_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_pending_mutations(&self, user_id: &str) -> Result<Vec<MutationJournalEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, user_id, cloud_user_id, entity_type, entity_id, operation, base_version, local_version, payload_json, created_at, retry_count, status, error_message, error_category, last_attempt_at
             FROM mutation_journal
             WHERE user_id = ?1 AND status IN ('pending', 'retryable_failure', 'in_flight')
             ORDER BY created_at ASC"
        )?;
        let rows = stmt.query_map([user_id], |row| {
            let payload_str: String = row.get(8)?;
            let payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap_or(serde_json::Value::Object(serde_json::Map::new()));
            Ok(MutationJournalEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                cloud_user_id: row.get(2)?,
                entity_type: row.get(3)?,
                entity_id: row.get(4)?,
                operation: row.get(5)?,
                base_version: row.get(6)?,
                local_version: row.get(7)?,
                payload,
                created_at: row.get(9)?,
                retry_count: row.get(10)?,
                status: row.get(11)?,
                error_message: row.get(12)?,
                error_category: row.get(13)?,
                last_attempt_at: row.get(14)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn update_mutation_status(&self, mutation_id: &str, status: &str, error: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono_now();
        conn.execute(
            "UPDATE mutation_journal
             SET status = ?1, error_message = ?2, last_attempt_at = ?3, retry_count = retry_count + 1
             WHERE id = ?4",
            params![status, error, now, mutation_id],
        )?;
        Ok(())
    }

    pub fn delete_mutation(&self, mutation_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM mutation_journal WHERE id = ?1",
            params![mutation_id],
        )?;
        Ok(())
    }

    // Focus Sessions
    pub fn save_focus_session(&self, s: &FocusSessionRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO focus_sessions (id, user_id, duration_seconds, mode, completed, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                duration_seconds = excluded.duration_seconds,
                mode = excluded.mode,
                completed = excluded.completed,
                created_at = excluded.created_at",
            params![
                s.id,
                s.user_id,
                s.duration_seconds,
                s.mode,
                if s.completed { 1 } else { 0 },
                s.created_at
            ],
        )?;
        Ok(())
    }

    pub fn list_focus_sessions(&self, user_id: &str) -> Result<Vec<FocusSessionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, user_id, duration_seconds, mode, completed, created_at FROM focus_sessions WHERE user_id = ?1 ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([user_id], |row| {
            Ok(FocusSessionRecord {
                id: row.get(0)?,
                user_id: row.get(1)?,
                duration_seconds: row.get(2)?,
                mode: row.get(3)?,
                completed: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    // Roadmap Progress
    pub fn toggle_milestone(&self, user_id: &str, roadmap_id: &str, milestone_id: &str, completed: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono_now();
        if completed {
            let id = format!("{}_{}_{}", user_id, roadmap_id, milestone_id);
            conn.execute(
                "INSERT INTO roadmap_progress (id, user_id, roadmap_id, milestone_id, completed, completed_at)
                 VALUES (?1, ?2, ?3, ?4, 1, ?5)
                 ON CONFLICT(user_id, roadmap_id, milestone_id) DO UPDATE SET
                    completed = 1,
                    completed_at = excluded.completed_at",
                params![id, user_id, roadmap_id, milestone_id, now],
            )?;
        } else {
            conn.execute(
                "DELETE FROM roadmap_progress WHERE user_id = ?1 AND roadmap_id = ?2 AND milestone_id = ?3",
                params![user_id, roadmap_id, milestone_id],
            )?;
        }
        Ok(())
    }

    pub fn get_roadmap_progress(&self, user_id: &str, roadmap_id: &str) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT milestone_id FROM roadmap_progress WHERE user_id = ?1 AND roadmap_id = ?2 AND completed = 1"
        )?;
        let rows = stmt.query_map(params![user_id, roadmap_id], |row| row.get::<_, String>(0))?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn purge_account_data(&self, user_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM durable_notes WHERE user_id = ?1", params![user_id])?;
        conn.execute("DELETE FROM durable_bookmarks WHERE user_id = ?1", params![user_id])?;
        conn.execute("DELETE FROM durable_progress WHERE user_id = ?1", params![user_id])?;
        conn.execute("DELETE FROM learning_items WHERE user_id = ?1", params![user_id])?;
        conn.execute("DELETE FROM mutation_journal WHERE user_id = ?1", params![user_id])?;
        conn.execute("DELETE FROM focus_sessions WHERE user_id = ?1", params![user_id])?;
        conn.execute("DELETE FROM roadmap_progress WHERE user_id = ?1", params![user_id])?;
        conn.execute("DELETE FROM user_profiles WHERE id = ?1", params![user_id])?;
        Ok(())
    }

    // Integrity Check
    pub fn integrity_check(&self) -> Result<(bool, Vec<String>)> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("PRAGMA integrity_check;")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut results = Vec::new();
        for r in rows {
            results.push(r?);
        }
        let is_ok = results.len() == 1 && results[0] == "ok";
        Ok((is_ok, results))
    }
}

fn chrono_now() -> String {
    // Simple ISO timestamp
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{}.{}", duration.as_secs(), duration.subsec_millis())
}
