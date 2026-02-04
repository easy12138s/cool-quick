use crate::database::Database;
use crate::models::Note;
use crate::clipboard::skip_next_clipboard_event;
use arboard::Clipboard;
use std::sync::Arc;
use tauri::{command, State};

#[command]
pub async fn clipboard_get_text() -> Result<String, String> {
    let mut clipboard = Clipboard::new()
        .map_err(|e| e.to_string())?;
    clipboard.get_text()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn clipboard_set_text(content: String) -> Result<(), String> {
    // Skip the next clipboard event to avoid triggering popup
    skip_next_clipboard_event();
    
    let mut clipboard = Clipboard::new()
        .map_err(|e| e.to_string())?;
    clipboard.set_text(content)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn clipboard_get_history(
    db: State<'_, Arc<Database>>,
    limit: i64,
) -> Result<Vec<Note>, String> {
    db.get_recently_used_notes(limit)
        .map_err(|e| e.to_string())
}
