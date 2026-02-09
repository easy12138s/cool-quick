#![allow(dead_code)]

use rusqlite::{params, Connection, Result};
use chrono::Utc;
use uuid::Uuid;
use std::sync::Mutex;

use crate::detector::ContentType;
use crate::models::{Note, NoteStats};

pub struct Database {
    conn: Mutex<Connection>,
}

// 实现 Send 和 Sync，因为 Mutex 保证了线程安全
unsafe impl Send for Database {}
unsafe impl Sync for Database {}

impl Database {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Self { conn: Mutex::new(conn) };
        db.initialize_tables()?;
        Ok(db)
    }

    fn initialize_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT DEFAULT '',
                content TEXT NOT NULL,
                content_hash TEXT,
                note_type TEXT NOT NULL,
                tags TEXT DEFAULT '[]',
                source_app TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_favorite INTEGER DEFAULT 0,
                is_archived INTEGER DEFAULT 0,
                use_count INTEGER DEFAULT 0
            );
            
            CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(note_type);
            CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(is_archived);
            CREATE INDEX IF NOT EXISTS idx_notes_hash ON notes(content_hash);
            
            CREATE TABLE IF NOT EXISTS custom_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                pattern TEXT NOT NULL,
                action_type TEXT NOT NULL,
                is_enabled INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL
            );
            
            -- Add window_positions table for storing window locations
            CREATE TABLE IF NOT EXISTS window_positions (
                window_name TEXT PRIMARY KEY,
                x REAL NOT NULL,
                y REAL NOT NULL,
                updated_at INTEGER NOT NULL
            );
            "
        )?;
        
        // Migration: Add title column if not exists (for existing databases)
        // SQLite doesn't support IF NOT EXISTS in ALTER TABLE, so we check manually
        let stmt = conn.prepare("PRAGMA table_info(notes)")?;
        let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        if !columns.contains(&"title".to_string()) {
            match conn.execute(
                "ALTER TABLE notes ADD COLUMN title TEXT DEFAULT ''",
                [],
            ) {
                Ok(_) => {}
                Err(e) => {
                    // Ignore error if column already exists (race condition)
                    if !e.to_string().contains("duplicate column name") {
                        return Err(e);
                    }
                }
            };
        }
        
        Ok(())
    }

    pub fn save_note(&self, content: &str, note_type: ContentType, tags: &str, source_app: &str, title: Option<&str>) -> Result<String> {
        // 计算内容哈希用于去重
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let normalized = content.trim().replace("\r\n", "\n");
        let mut hasher = DefaultHasher::new();
        normalized.hash(&mut hasher);
        let content_hash = format!("{:x}", hasher.finish());
        
        self.save_note_with_hash(content, &content_hash, note_type, tags, source_app, title)
    }

    pub fn get_notes(&self, limit: i64, offset: i64, include_archived: bool) -> Result<Vec<Note>> {
        let conn = self.conn.lock().unwrap();
        let sql = if include_archived {
            "SELECT * FROM notes ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
        } else {
            "SELECT * FROM notes WHERE is_archived = 0 ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
        };
        
        let mut stmt = conn.prepare(sql)?;
        let notes = stmt.query_map(params![limit, offset], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                note_type: row.get(3)?,
                tags: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                source_app: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                is_favorite: row.get::<_, i32>(8)? != 0,
                is_archived: row.get::<_, i32>(9)? != 0,
                use_count: row.get(10)?,
            })
        })?;
        
        notes.collect::<Result<Vec<_>>>()
    }

    pub fn get_note_by_id(&self, id: &str) -> Result<Option<Note>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM notes WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        
        if let Some(row) = rows.next()? {
            Ok(Some(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                note_type: row.get(3)?,
                tags: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                source_app: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                is_favorite: row.get::<_, i32>(8)? != 0,
                is_archived: row.get::<_, i32>(9)? != 0,
                use_count: row.get(10)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn search_notes(&self, query: &str, note_type: Option<&str>, limit: i64) -> Result<Vec<Note>> {
        let conn = self.conn.lock().unwrap();
        let search_pattern = format!("%{}%", query);
        
        let notes: Vec<Note> = if let Some(t) = note_type {
            let mut stmt = conn.prepare(
                "SELECT * FROM notes WHERE content LIKE ?1 AND note_type = ?2 AND is_archived = 0 ORDER BY created_at DESC LIMIT ?3"
            )?;
            let rows = stmt.query_map(params![search_pattern, t, limit], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    note_type: row.get(3)?,
                    tags: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                    source_app: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    is_favorite: row.get::<_, i32>(8)? != 0,
                    is_archived: row.get::<_, i32>(9)? != 0,
                    use_count: row.get(10)?,
                })
            })?;
            rows.collect::<Result<Vec<_>>>()?
        } else {
            let mut stmt = conn.prepare(
                "SELECT * FROM notes WHERE content LIKE ?1 AND is_archived = 0 ORDER BY created_at DESC LIMIT ?2"
            )?;
            let rows = stmt.query_map(params![search_pattern, limit], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    note_type: row.get(3)?,
                    tags: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                    source_app: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    is_favorite: row.get::<_, i32>(8)? != 0,
                    is_archived: row.get::<_, i32>(9)? != 0,
                    use_count: row.get(10)?,
                })
            })?;
            rows.collect::<Result<Vec<_>>>()?
        };
        
        Ok(notes)
    }

    pub fn update_note(&self, id: &str, content: Option<&str>, title: Option<&str>, note_type: Option<&str>, tags: Option<Vec<String>>, use_count: Option<i32>, is_favorite: Option<bool>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        // Always update the updated_at timestamp
        conn.execute(
            "UPDATE notes SET updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        if let Some(c) = content {
            conn.execute(
                "UPDATE notes SET content = ?1, updated_at = ?2 WHERE id = ?3",
                params![c, now, id],
            )?;
        }

        if let Some(t) = title {
            conn.execute(
                "UPDATE notes SET title = ?1, updated_at = ?2 WHERE id = ?3",
                params![t, now, id],
            )?;
        }

        if let Some(nt) = note_type {
            conn.execute(
                "UPDATE notes SET note_type = ?1, updated_at = ?2 WHERE id = ?3",
                params![nt, now, id],
            )?;
        }

        if let Some(tags_vec) = tags {
            let tags_json = serde_json::to_string(&tags_vec).unwrap_or_default();
            conn.execute(
                "UPDATE notes SET tags = ?1, updated_at = ?2 WHERE id = ?3",
                params![tags_json, now, id],
            )?;
        }

        if let Some(uc) = use_count {
            conn.execute(
                "UPDATE notes SET use_count = ?1, updated_at = ?2 WHERE id = ?3",
                params![uc, now, id],
            )?;
        }

        if let Some(f) = is_favorite {
            conn.execute(
                "UPDATE notes SET is_favorite = ?1, updated_at = ?2 WHERE id = ?3",
                params![if f { 1i32 } else { 0 }, now, id],
            )?;
        }

        Ok(())
    }

    pub fn delete_note(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn archive_note_by_id(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();
        conn.execute(
            "UPDATE notes SET is_archived = 1, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    pub fn unarchive_note_by_id(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();
        conn.execute(
            "UPDATE notes SET is_archived = 0, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    pub fn archive_notes_by_date(&self, days: i64) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let cutoff = Utc::now().timestamp() - (days * 24 * 60 * 60);
        let count = conn.execute(
            "UPDATE notes SET is_archived = 1, updated_at = ?1 WHERE created_at < ?2 AND is_archived = 0",
            params![Utc::now().timestamp(), cutoff],
        )?;
        Ok(count as i64)
    }

    pub fn archive_notes_by_type(&self, note_type: &str, days: i64) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let cutoff = Utc::now().timestamp() - (days * 24 * 60 * 60);
        let count = conn.execute(
            "UPDATE notes SET is_archived = 1, updated_at = ?1 WHERE note_type = ?2 AND created_at < ?3 AND is_archived = 0",
            params![Utc::now().timestamp(), note_type, cutoff],
        )?;
        Ok(count as i64)
    }

    pub fn get_archived_notes(&self, limit: i64, offset: i64) -> Result<Vec<Note>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM notes WHERE is_archived = 1 ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
        )?;
        
        let notes = stmt.query_map(params![limit, offset], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                note_type: row.get(3)?,
                tags: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                source_app: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                is_favorite: row.get::<_, i32>(8)? != 0,
                is_archived: row.get::<_, i32>(9)? != 0,
                use_count: row.get(10)?,
            })
        })?;
        
        notes.collect::<Result<Vec<_>>>()
    }

    pub fn get_recently_used_notes(&self, limit: i64) -> Result<Vec<Note>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM notes WHERE is_archived = 0 ORDER BY use_count DESC, updated_at DESC LIMIT ?1"
        )?;
        
        let notes = stmt.query_map(params![limit], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                note_type: row.get(3)?,
                tags: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                source_app: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                is_favorite: row.get::<_, i32>(8)? != 0,
                is_archived: row.get::<_, i32>(9)? != 0,
                use_count: row.get(10)?,
            })
        })?;
        
        notes.collect::<Result<Vec<_>>>()
    }

    pub fn import_note(&self, note: &Note) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&note.tags).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO notes (id, title, content, note_type, tags, source_app, created_at, updated_at, is_favorite, is_archived, use_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                &note.id,
                &note.title,
                &note.content,
                &note.note_type,
                tags_json,
                &note.source_app,
                note.created_at,
                note.updated_at,
                note.is_favorite as i32,
                note.is_archived as i32,
                note.use_count
            ],
        )?;
        Ok(())
    }

    pub fn export_to_json(&self) -> Result<String> {
        let notes = self.get_notes(10000, 0, true)?;
        let json = serde_json::to_string_pretty(&notes).map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(e))
        })?;
        Ok(json)
    }

    pub fn get_stats(&self) -> Result<NoteStats> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();
        let today_start = now - (now % 86400); // Start of today
        let week_start = now - (7 * 24 * 60 * 60);

        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE is_archived = 0",
            [],
            |row| row.get(0)
        )?;

        let today: i64 = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE is_archived = 0 AND created_at >= ?1",
            params![today_start],
            |row| row.get(0)
        )?;

        let week: i64 = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE is_archived = 0 AND created_at >= ?1",
            params![week_start],
            |row| row.get(0)
        )?;

        let favorite: i64 = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE is_archived = 0 AND is_favorite = 1",
            [],
            |row| row.get(0)
        )?;

        let mut stmt = conn.prepare(
            "SELECT note_type, COUNT(*) FROM notes WHERE is_archived = 0 GROUP BY note_type"
        )?;
        
        let by_type: std::collections::HashMap<String, i64> = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(NoteStats {
            total,
            today,
            week,
            favorite,
            by_type,
        })
    }

    pub fn save_window_position(&self, window_name: &str, x: f64, y: f64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();
        conn.execute(
            "INSERT OR REPLACE INTO window_positions (window_name, x, y, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![window_name, x, y, now],
        )?;
        Ok(())
    }

    pub fn get_window_position(&self, window_name: &str) -> Result<Option<(f64, f64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT x, y FROM window_positions WHERE window_name = ?1"
        )?;
        let mut rows = stmt.query(params![window_name])?;
        
        if let Some(row) = rows.next()? {
            let x: f64 = row.get(0)?;
            let y: f64 = row.get(1)?;
            Ok(Some((x, y)))
        } else {
            Ok(None)
        }
    }

    /// 增加笔记使用计数
    pub fn increment_use_count(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();
        conn.execute(
            "UPDATE notes SET use_count = use_count + 1, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    /// 根据内容哈希检查笔记是否已存在（用于去重）
    pub fn is_content_exists(&self, content_hash: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE content_hash = ?1 AND is_archived = 0",
            params![content_hash],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    /// 保存笔记时同时保存内容哈希
    pub fn save_note_with_hash(&self, content: &str, content_hash: &str, note_type: crate::detector::ContentType, tags: &str, source_app: &str, title: Option<&str>) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();
        
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO notes (id, title, content, content_hash, note_type, tags, source_app, created_at, updated_at, is_favorite, is_archived, use_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 0, 0)",
            params![&id, title.unwrap_or(""), content, content_hash, note_type.to_string(), tags, source_app, now, now],
        )?;
        
        Ok(id)
    }
}
