use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use clipboard_master::{CallbackResult, ClipboardHandler, Master};
use arboard::Clipboard;

use crate::config::AppConfig;
use crate::database::Database;
use crate::detector::{ContentType, ContentDetector};
use tauri::{AppHandle, Manager};

// Global flag to skip next clipboard event (when copying from drawer)
static SKIP_NEXT_EVENT: AtomicBool = AtomicBool::new(false);

pub struct ClipboardManager {
    db: Arc<Database>,
    config: AppConfig,
    app_handle: AppHandle,
    detector: ContentDetector,
    last_content: Mutex<String>,
}

struct ClipboardHandlerImpl {
    db: Arc<Database>,
    app_handle: AppHandle,
    detector: ContentDetector,
    config: AppConfig,
    last_content: Arc<Mutex<String>>,
}

impl ClipboardManager {
    pub fn new(db: Arc<Database>, config: AppConfig, app_handle: AppHandle) -> Self {
        Self {
            db,
            config,
            app_handle,
            detector: ContentDetector::new(),
            last_content: Mutex::new(String::new()),
        }
    }

    pub fn start_monitoring(&mut self) {
        let handler = ClipboardHandlerImpl {
            db: self.db.clone(),
            app_handle: self.app_handle.clone(),
            detector: self.detector.clone(),
            config: self.config.clone(),
            last_content: Arc::new(Mutex::new(String::new())),
        };

        let mut master = Master::new(handler);
        master.run().expect("Failed to start clipboard monitoring");
    }
}

impl ClipboardHandler for ClipboardHandlerImpl {
    fn on_clipboard_change(&mut self) -> CallbackResult {
        // Check if we should skip this event (internal copy)
        if SKIP_NEXT_EVENT.swap(false, Ordering::SeqCst) {
            return CallbackResult::Next;
        }

        if let Ok(mut clipboard) = Clipboard::new() {
            if let Ok(content) = clipboard.get_text() {
                // Check for duplicates (5-second window)
                let should_process = {
                    let last = self.last_content.lock().unwrap();
                    content != *last
                };

                if should_process && !content.is_empty() {
                    // Update last content
                    {
                        let mut last = self.last_content.lock().unwrap();
                        *last = content.clone();
                    }

                    // Detect content type
                    let content_type = self.detector.detect(&content);
                    
                    // Check if should show popup
                    if self.should_show_popup(&content, &content_type) {
                        // Emit event to frontend
                        self.app_handle.emit_all("clipboard-change", serde_json::json!({
                            "content": &content[..content.chars().take(150).count().min(content.len())],
                            "type": content_type.to_string(),
                            "full_length": content.len(),
                        })).unwrap();

                        // Show popup window
                        crate::window::show_popup_window(&self.app_handle, &content, &content_type.to_string());
                    }

                    // Note: We don't auto-save here anymore
                    // Content is only saved when user clicks "Save" in the popup
                }
            }
        }
        
        CallbackResult::Next
    }
}

impl ClipboardHandlerImpl {
    fn should_show_popup(&self, content: &str, content_type: &ContentType) -> bool {
        // Check if content is too short (likely verification code)
        if content.chars().all(|c| c.is_ascii_digit()) && content.len() < 6 {
            return false;
        }

        // Check minimum length
        if content.len() > self.config.min_popup_length {
            return true;
        }

        // Check content type
        matches!(content_type, ContentType::Phone | ContentType::Email | ContentType::Url | ContentType::Code)
    }
}

// Function to set the skip flag (called when copying from drawer)
pub fn skip_next_clipboard_event() {
    SKIP_NEXT_EVENT.store(true, Ordering::SeqCst);
}
