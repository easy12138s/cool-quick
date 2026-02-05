#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub note_type: String,
    pub tags: Vec<String>,
    pub source_app: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_favorite: bool,
    pub is_archived: bool,
    pub use_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteFilters {
    pub search: Option<String>,
    pub note_type: Option<String>,
    pub is_favorite: Option<bool>,
    pub is_archived: Option<bool>,
    pub date_from: Option<i64>,
    pub date_to: Option<i64>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteStats {
    pub total: i64,
    pub today: i64,
    pub week: i64,
    pub favorite: i64,
    pub by_type: std::collections::HashMap<String, i64>,
}
