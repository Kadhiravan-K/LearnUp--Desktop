mod db;

use db::{DatabaseManager, DurableBookmark, DurableNote, DurableProgress, FocusSessionRecord, LearningItem, MutationJournalEntry, UserProfile};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

struct AppState {
    db: Mutex<Option<DatabaseManager>>,
}

#[derive(Serialize)]
struct IntegrityResult {
    ok: bool,
    issues: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct YouTubeMetadata {
    title: String,
    author: String,
    #[serde(rename = "thumbnailUrl")]
    thumbnail_url: String,
    #[serde(rename = "isPlaylist")]
    is_playlist: bool,
    #[serde(rename = "sourceId")]
    source_id: String,
}

#[tauri::command]
fn db_init(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    if db_guard.is_some() {
        return Ok(());
    }

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));

    let db_path = app_dir.join("learnup.db");
    let mgr = DatabaseManager::new(db_path).map_err(|e| format!("SQLite initialization error: {}", e))?;
    *db_guard = Some(mgr);
    Ok(())
}

#[tauri::command]
fn db_list_profiles(state: State<'_, AppState>) -> Result<Vec<UserProfile>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.list_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
fn db_save_profile(state: State<'_, AppState>, profile: UserProfile) -> Result<UserProfile, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.save_profile(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
fn db_get_active_profile(state: State<'_, AppState>) -> Result<Option<UserProfile>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.get_active_profile().map_err(|e| e.to_string())
}

#[tauri::command]
fn db_set_active_profile(state: State<'_, AppState>, profile_id: String) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.set_active_profile(&profile_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_list_learning_items(state: State<'_, AppState>, user_id: String) -> Result<Vec<LearningItem>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.list_learning_items(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_save_learning_item(state: State<'_, AppState>, item: LearningItem) -> Result<LearningItem, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.save_learning_item(&item).map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
fn db_delete_learning_item(state: State<'_, AppState>, user_id: String, item_id: String) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.delete_learning_item(&user_id, &item_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_get_note(state: State<'_, AppState>, user_id: String, note_id: String) -> Result<Option<DurableNote>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.get_note(&user_id, &note_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_list_notes(state: State<'_, AppState>, user_id: String) -> Result<Vec<DurableNote>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.list_notes(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_save_note(state: State<'_, AppState>, note: DurableNote) -> Result<DurableNote, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.save_note(&note).map_err(|e| e.to_string())?;
    Ok(note)
}

#[tauri::command]
fn db_delete_note(state: State<'_, AppState>, user_id: String, note_id: String) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.delete_note(&user_id, &note_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_get_bookmark(state: State<'_, AppState>, user_id: String, bookmark_id: String) -> Result<Option<DurableBookmark>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.get_bookmark(&user_id, &bookmark_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_list_bookmarks(state: State<'_, AppState>, user_id: String) -> Result<Vec<DurableBookmark>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.list_bookmarks(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_save_bookmark(state: State<'_, AppState>, bookmark: DurableBookmark) -> Result<DurableBookmark, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.save_bookmark(&bookmark).map_err(|e| e.to_string())?;
    Ok(bookmark)
}

#[tauri::command]
fn db_delete_bookmark(state: State<'_, AppState>, user_id: String, bookmark_id: String) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.delete_bookmark(&user_id, &bookmark_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_get_progress(state: State<'_, AppState>, user_id: String, youtube_video_id: String) -> Result<Option<DurableProgress>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.get_progress(&user_id, &youtube_video_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_list_progress(state: State<'_, AppState>, user_id: String) -> Result<Vec<DurableProgress>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.list_progress(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_save_progress(state: State<'_, AppState>, progress: DurableProgress) -> Result<DurableProgress, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.save_progress(&progress).map_err(|e| e.to_string())?;
    Ok(progress)
}

#[tauri::command]
fn db_append_mutation(state: State<'_, AppState>, mutation: MutationJournalEntry) -> Result<MutationJournalEntry, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.append_mutation(&mutation).map_err(|e| e.to_string())?;
    Ok(mutation)
}

#[tauri::command]
fn db_get_pending_mutations(state: State<'_, AppState>, user_id: String) -> Result<Vec<MutationJournalEntry>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.get_pending_mutations(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_update_mutation_status(state: State<'_, AppState>, mutation_id: String, status: String, error: Option<String>) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.update_mutation_status(&mutation_id, &status, error.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_delete_mutation(state: State<'_, AppState>, mutation_id: String) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.delete_mutation(&mutation_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_purge_account(state: State<'_, AppState>, user_id: String) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.purge_account_data(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_save_focus_session(state: State<'_, AppState>, session: FocusSessionRecord) -> Result<FocusSessionRecord, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.save_focus_session(&session).map_err(|e| e.to_string())?;
    Ok(session)
}

#[tauri::command]
fn db_list_focus_sessions(state: State<'_, AppState>, user_id: String) -> Result<Vec<FocusSessionRecord>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.list_focus_sessions(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_toggle_milestone(state: State<'_, AppState>, user_id: String, roadmap_id: String, milestone_id: String, completed: bool) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.toggle_milestone(&user_id, &roadmap_id, &milestone_id, completed).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_get_roadmap_progress(state: State<'_, AppState>, user_id: String, roadmap_id: String) -> Result<Vec<String>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    db.get_roadmap_progress(&user_id, &roadmap_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_integrity_check(state: State<'_, AppState>) -> Result<IntegrityResult, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    let (ok, issues) = db.integrity_check().map_err(|e| e.to_string())?;
    Ok(IntegrityResult { ok, issues })
}

#[tauri::command]
fn check_online_status() -> bool {
    // Native desktop check
    true
}

#[tauri::command]
fn fetch_remote_text(url: String) -> Result<String, String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Only HTTP/HTTPS URLs are allowed".to_string());
    }
    let output = std::process::Command::new("curl.exe")
        .args(["-s", "-L", "--max-time", "15", &url])
        .output()
        .map_err(|e| format!("Failed to execute curl: {}", e))?;
    if !output.status.success() {
        return Err(format!("Network request exited with code: {:?}", output.status.code()));
    }
    String::from_utf8(output.stdout).map_err(|e| format!("Invalid response encoding: {}", e))
}

#[tauri::command]
fn fetch_youtube_metadata(url: String) -> Result<YouTubeMetadata, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    // 1. Check for playlist: list=...
    if let Some(list_pos) = trimmed.find("list=") {
        let after_list = &trimmed[list_pos + 5..];
        let playlist_id = after_list
            .split(&['&', '#', ' '][..])
            .next()
            .unwrap_or("")
            .trim();

        if playlist_id.is_empty() {
            return Err("Invalid or empty playlist ID in YouTube URL".to_string());
        }

        let oembed_url = format!(
            "https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list={}&format=json",
            playlist_id
        );

        let oembed_res = std::process::Command::new("curl.exe")
            .args(["-s", "-L", "--max-time", "10", &oembed_url])
            .output();

        let mut title = format!("Playlist ({})", playlist_id);
        let mut author = "YouTube Creator".to_string();
        let mut thumbnail_url = String::new();

        if let Ok(out) = oembed_res {
            if out.status.success() {
                if let Ok(json_str) = String::from_utf8(out.stdout) {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&json_str) {
                        if let Some(t) = v.get("title").and_then(|s| s.as_str()) {
                            title = t.to_string();
                        }
                        if let Some(a) = v.get("author_name").and_then(|s| s.as_str()) {
                            author = a.to_string();
                        }
                        if let Some(thumb) = v.get("thumbnail_url").and_then(|s| s.as_str()) {
                            thumbnail_url = thumb.to_string();
                        }
                    }
                }
            }
        }

        return Ok(YouTubeMetadata {
            title,
            author,
            thumbnail_url,
            is_playlist: true,
            source_id: playlist_id.to_string(),
        });
    }

    // 2. Video URL: watch?v=, youtu.be/, /shorts/, /embed/
    let video_id = if let Some(pos) = trimmed.find("v=") {
        let after_v = &trimmed[pos + 2..];
        after_v.split(&['&', '#', ' '][..]).next().unwrap_or("")
    } else if let Some(pos) = trimmed.find("youtu.be/") {
        let after_be = &trimmed[pos + 9..];
        after_be.split(&['?', '/', '#', ' '][..]).next().unwrap_or("")
    } else if let Some(pos) = trimmed.find("/shorts/") {
        let after_shorts = &trimmed[pos + 8..];
        after_shorts.split(&['?', '/', '#', ' '][..]).next().unwrap_or("")
    } else if let Some(pos) = trimmed.find("/embed/") {
        let after_embed = &trimmed[pos + 7..];
        after_embed.split(&['?', '/', '#', ' '][..]).next().unwrap_or("")
    } else {
        ""
    };

    if video_id.len() < 5 {
        return Err("Invalid YouTube URL: could not detect a valid video or playlist ID".to_string());
    }

    let oembed_url = format!(
        "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={}&format=json",
        video_id
    );

    let oembed_res = std::process::Command::new("curl.exe")
        .args(["-s", "-L", "--max-time", "10", &oembed_url])
        .output();

    let mut title = format!("Video ({})", video_id);
    let mut author = "YouTube Creator".to_string();
    let mut thumbnail_url = format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", video_id);

    if let Ok(out) = oembed_res {
        if out.status.success() {
            if let Ok(json_str) = String::from_utf8(out.stdout) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(t) = v.get("title").and_then(|s| s.as_str()) {
                        title = t.to_string();
                    }
                    if let Some(a) = v.get("author_name").and_then(|s| s.as_str()) {
                        author = a.to_string();
                    }
                    if let Some(thumb) = v.get("thumbnail_url").and_then(|s| s.as_str()) {
                        thumbnail_url = thumb.to_string();
                    }
                }
            }
        }
    }

    Ok(YouTubeMetadata {
        title,
        author,
        thumbnail_url,
        is_playlist: false,
        source_id: video_id.to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            // Build Native Application Menu
            let file_menu = tauri::menu::SubmenuBuilder::new(app, "File")
                .close_window()
                .separator()
                .quit()
                .build()?;

            let edit_menu = tauri::menu::SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .separator()
                .select_all()
                .build()?;

            let view_menu = tauri::menu::SubmenuBuilder::new(app, "View")
                .fullscreen()
                .build()?;

            let help_menu = tauri::menu::SubmenuBuilder::new(app, "Help")
                .about(Some(tauri::menu::AboutMetadata {
                    name: Some("LearnUp Desktop".to_string()),
                    version: Some("0.1.0".to_string()),
                    comments: Some("Safe offline-first desktop learning platform".to_string()),
                    ..Default::default()
                }))
                .build()?;

            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            // Build System Tray
            let open_item = tauri::menu::MenuItemBuilder::with_id("open", "Open LearnUp").build(app)?;
            let hide_item = tauri::menu::MenuItemBuilder::with_id("hide", "Hide to Tray").build(app)?;
            let quit_item = tauri::menu::MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let tray_menu = tauri::menu::MenuBuilder::new(app)
                .item(&open_item)
                .item(&hide_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let icon = app.default_window_icon().cloned().expect("window icon not configured");
            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(icon)
                .tooltip("LearnUp Desktop")
                .menu(&tray_menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, button_state: tauri::tray::MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Ensure clean exit: releases database handles and guarantees no orphan WebView2 processes
                window.app_handle().exit(0);
            }
        })
        .manage(AppState {
            db: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            db_init,
            db_list_profiles,
            db_save_profile,
            db_get_active_profile,
            db_set_active_profile,
            db_list_learning_items,
            db_save_learning_item,
            db_delete_learning_item,
            db_get_note,
            db_list_notes,
            db_save_note,
            db_delete_note,
            db_get_bookmark,
            db_list_bookmarks,
            db_save_bookmark,
            db_delete_bookmark,
            db_get_progress,
            db_list_progress,
            db_save_progress,
            db_append_mutation,
            db_get_pending_mutations,
            db_update_mutation_status,
            db_delete_mutation,
            db_purge_account,
            db_save_focus_session,
            db_list_focus_sessions,
            db_toggle_milestone,
            db_get_roadmap_progress,
            db_integrity_check,
            check_online_status,
            fetch_youtube_metadata,
            fetch_remote_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running learnup desktop application");
}
