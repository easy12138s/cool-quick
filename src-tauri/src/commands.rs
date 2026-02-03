use arboard::Clipboard;
use serde_json::Value;
use tauri::{command, AppHandle, Manager, State, WindowBuilder, WindowUrl};
use std::sync::Arc;

use crate::config::AppConfig;
use crate::database::{Database, Note};
use crate::detector::ContentType;

#[command]
pub fn get_notes(
    db: State<'_, Arc<Database>>,
    limit: i64,
    offset: i64,
    include_archived: bool,
) -> Result<Vec<Note>, String> {
    db.get_notes(limit, offset, include_archived)
        .map_err(|e| e.to_string())
}

#[command]
pub fn create_note(
    db: State<'_, Arc<Database>>,
    content: String,
    note_type: String,
    tags: String,
    source_app: String,
) -> Result<(), String> {
    let content_type = match note_type.as_str() {
        "phone" => ContentType::Phone,
        "email" => ContentType::Email,
        "url" => ContentType::Url,
        "code" => ContentType::Code,
        "password" => ContentType::Password,
        _ => ContentType::Text,
    };
    
    db.save_note(&content, content_type, &tags, &source_app)
        .map_err(|e| e.to_string())
}

#[command]
pub fn update_note(
    db: State<'_, Arc<Database>>,
    id: String,
    content: Option<String>,
    is_favorite: Option<bool>,
) -> Result<(), String> {
    db.update_note(&id, content.as_deref(), is_favorite)
        .map_err(|e| e.to_string())
}

#[command]
pub fn delete_note(db: State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.delete_note(&id).map_err(|e| e.to_string())
}

#[command]
pub fn search_notes(
    db: State<'_, Arc<Database>>,
    query: String,
    note_type: Option<String>,
) -> Result<Vec<Note>, String> {
    let note_type_ref = note_type.as_deref();
    db.search_notes(&query, note_type_ref)
        .map_err(|e| e.to_string())
}

#[command]
pub fn get_archived_notes(
    db: State<'_, Arc<Database>>,
    limit: i64,
    offset: i64,
) -> Result<Vec<Note>, String> {
    db.get_archived_notes(limit, offset)
        .map_err(|e| e.to_string())
}

#[command]
pub fn archive_notes(
    db: State<'_, Arc<Database>>,
    by_date_days: Option<i64>,
    by_type: Option<(String, i64)>,
) -> Result<i64, String> {
    if let Some(days) = by_date_days {
        db.archive_notes_by_date(days).map_err(|e| e.to_string())
    } else if let Some((note_type, days)) = by_type {
        db.archive_notes_by_type(&note_type, days).map_err(|e| e.to_string())
    } else {
        Err("Must specify archive criteria".to_string())
    }
}

#[command]
pub fn get_config(config: State<'_, AppConfig>) -> Result<AppConfig, String> {
    Ok(config.inner().clone())
}

#[command]
pub fn update_config(
    config: State<'_, AppConfig>,
    new_config: AppConfig,
) -> Result<AppConfig, String> {
    new_config.save().map_err(|e| e.to_string())?;
    Ok(new_config)
}

#[command]
pub fn copy_to_clipboard(content: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(content).map_err(|e| e.to_string())
}

#[command]
pub fn export_data(
    db: State<'_, Arc<Database>>,
    format: String,
) -> Result<String, String> {
    match format.as_str() {
        "json" => db.export_to_json().map_err(|e| e.to_string()),
        _ => Err("Unsupported export format".to_string()),
    }
}

#[command]
pub fn import_data(_db: State<'_, Arc<Database>>, _data: String) -> Result<(), String> {
    // TODO: Implement import functionality
    Ok(())
}

#[command]
pub fn start_clipboard_monitor() -> Result<(), String> {
    // Clipboard monitoring is started automatically in setup
    Ok(())
}

#[command]
pub fn stop_clipboard_monitor() -> Result<(), String> {
    // TODO: Implement stop monitoring
    Ok(())
}
