use crate::database::Database;
use crate::models::Note;
use crate::detector::ContentType;
use std::sync::Arc;
use tauri::{command, State};

// Notes commands - CRUD operations
#[command]
pub async fn notes_get_all(
    db: State<'_, Arc<Database>>,
    limit: i64,
    offset: i64,
    include_archived: bool,
) -> Result<Vec<Note>, String> {
    db.get_notes(limit, offset, include_archived)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn notes_get_by_id(
    db: State<'_, Arc<Database>>,
    id: String,
) -> Result<Option<Note>, String> {
    db.get_note_by_id(&id)
        .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
struct CreateNoteRequest {
    content: String,
    #[serde(rename = "noteType")]
    note_type: String,
    tags: Vec<String>,
    #[serde(rename = "sourceApp")]
    source_app: String,
    title: Option<String>,
}

#[command]
pub async fn notes_create(
    db: State<'_, Arc<Database>>,
    request: CreateNoteRequest,
) -> Result<String, String> {
    // Convert note_type string to ContentType
    let content_type = match request.note_type.as_str() {
        "phone" => ContentType::Phone,
        "email" => ContentType::Email,
        "url" => ContentType::Url,
        "code" => ContentType::Code,
        "password" => ContentType::Password,
        _ => ContentType::Text,
    };
    
    let tags_json = serde_json::to_string(&request.tags).unwrap_or_default();
    let id = db.save_note(&request.content, content_type, &tags_json, &request.source_app, request.title.as_deref())
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[command]
pub async fn notes_update(
    db: State<'_, Arc<Database>>,
    id: String,
    content: Option<String>,
    title: Option<String>,
    note_type: Option<String>,
    tags: Option<Vec<String>>,
    use_count: Option<i32>,
    is_favorite: Option<bool>,
) -> Result<(), String> {
    db.update_note(
        &id,
        content.as_deref(),
        title.as_deref(),
        note_type.as_deref(),
        tags,
        use_count,
        is_favorite,
    ).map_err(|e| e.to_string())
}

#[command]
pub async fn notes_delete(
    db: State<'_, Arc<Database>>,
    id: String,
) -> Result<(), String> {
    db.delete_note(&id)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn notes_search(
    db: State<'_, Arc<Database>>,
    query: String,
    note_type: Option<String>,
    limit: i64,
) -> Result<Vec<Note>, String> {
    db.search_notes(&query, note_type.as_deref(), limit)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn notes_get_archived(
    db: State<'_, Arc<Database>>,
    limit: i64,
    offset: i64,
) -> Result<Vec<Note>, String> {
    db.get_archived_notes(limit, offset)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn notes_archive(
    db: State<'_, Arc<Database>>,
    id: String,
) -> Result<(), String> {
    db.archive_note_by_id(&id)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn notes_unarchive(
    db: State<'_, Arc<Database>>,
    id: String,
) -> Result<(), String> {
    db.unarchive_note_by_id(&id)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn notes_export(
    db: State<'_, Arc<Database>>,
    format: String,
) -> Result<String, String> {
    match format.as_str() {
        "json" => db.export_to_json().map_err(|e| e.to_string()),
        _ => Err("Unsupported format".to_string()),
    }
}

#[command]
pub async fn notes_import(
    db: State<'_, Arc<Database>>,
    data: String,
) -> Result<serde_json::Value, String> {
    let notes: Vec<Note> = serde_json::from_str(&data)
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    
    let total = notes.len();
    let mut success = 0;
    let mut failed = 0;
    
    for note in &notes {
        match db.import_note(note) {
            Ok(_) => success += 1,
            Err(_) => failed += 1,
        }
    }
    
    Ok(serde_json::json!({
        "success": success,
        "failed": failed,
        "total": total
    }))
}

#[command]
pub async fn notes_get_stats(
    db: State<'_, Arc<Database>>,
) -> Result<serde_json::Value, String> {
    let stats = db.get_stats()
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!(stats))
}
