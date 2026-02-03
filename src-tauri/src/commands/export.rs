use std::sync::Arc;
use tauri::State;
use crate::services::pdf_service::PdfService;
use crate::database::Database;
use base64::encode;

#[tauri::command]
pub async fn export_to_pdf(
    db: State<'_, Arc<Database>>,
    note_ids: Vec<String>,
    include_metadata: bool,
) -> Result<String, String> {
    let notes = if note_ids.is_empty() {
        db.get_notes(1000, 0, false)
            .map_err(|e| e.to_string())?
    } else {
        let mut result = Vec::new();
        for id in note_ids {
            if let Ok(Some(note)) = db.get_note_by_id(&id) {
                result.push(note);
            }
        }
        result
    };

    let pdf_service = PdfService::new();
    let pdf_bytes = pdf_service.generate_pdf(&notes, include_metadata)
        .map_err(|e| e.to_string())?;

    // Convert to base64 for transfer
    let base64_string = encode(&pdf_bytes);
    Ok(base64_string)
}

#[tauri::command]
pub async fn export_to_txt(
    db: State<'_, Arc<Database>>,
    note_ids: Vec<String>,
) -> Result<String, String> {
    let notes = if note_ids.is_empty() {
        db.get_notes(1000, 0, false)
            .map_err(|e| e.to_string())?
    } else {
        let mut result = Vec::new();
        for id in note_ids {
            if let Ok(Some(note)) = db.get_note_by_id(&id) {
                result.push(note);
            }
        }
        result
    };

    let mut output = String::new();
    output.push_str("CoolQuick Notes Export\n");
    output.push_str("======================\n\n");
    output.push_str(&format!("Generated: {}\n\n", chrono::Local::now().to_rfc2822()));

    for (i, note) in notes.iter().enumerate() {
        output.push_str(&format!("Note #{}\n", i + 1));
        output.push_str(&format!("Type: {}\n", note.note_type));
        output.push_str(&format!("Created: {}\n", 
            chrono::DateTime::from_timestamp_opt(note.created_at, 0)
                .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string())
                .unwrap_or_default()));
        output.push_str(&format!("Content:\n{}\n", note.content));
        output.push_str("\n---\n\n");
    }

    Ok(output)
}