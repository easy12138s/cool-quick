#![allow(dead_code)]

use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use chrono::{DateTime, Local, TimeZone};

pub struct BackupService;

impl BackupService {
    pub fn new() -> Self {
        Self
    }

    /// Create a backup of the database
    pub fn create_backup(
        &self,
        db_path: &Path,
        backup_dir: &Path,
        max_backups: usize,
    ) -> Result<PathBuf, String> {
        // Ensure backup directory exists
        fs::create_dir_all(backup_dir)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;

        // Generate backup filename with timestamp
        let timestamp = Local::now().format("%Y%m%d_%H%M%S");
        let backup_filename = format!("coolquick_backup_{}.db", timestamp);
        let backup_path = backup_dir.join(&backup_filename);

        // Copy database file
        fs::copy(db_path, &backup_path)
            .map_err(|e| format!("Failed to create backup: {}", e))?;

        // Clean up old backups
        self.cleanup_old_backups(backup_dir, max_backups)?;

        Ok(backup_path)
    }

    /// Restore database from backup
    pub fn restore_backup(
        &self,
        backup_path: &Path,
        db_path: &Path,
    ) -> Result<(), String> {
        if !backup_path.exists() {
            return Err("Backup file not found".to_string());
        }

        // Create a backup of current database before restoring
        if db_path.exists() {
            let parent_dir = db_path.parent().unwrap_or(Path::new("."));
            let timestamp = Local::now().format("%Y%m%d_%H%M%S");
            let auto_backup = parent_dir.join(format!(
                "coolquick_pre_restore_{}.db",
                timestamp
            ));
            fs::copy(db_path, &auto_backup)
                .map_err(|e| format!("Failed to backup current database: {}", e))?;
        }

        // Restore from backup
        fs::copy(backup_path, db_path)
            .map_err(|e| format!("Failed to restore backup: {}", e))?;

        Ok(())
    }

    /// Get list of available backups
    pub fn list_backups(&self, backup_dir: &Path) -> Result<Vec<BackupInfo>, String> {
        if !backup_dir.exists() {
            return Ok(Vec::new());
        }

        let mut backups = Vec::new();

        for entry in fs::read_dir(backup_dir)
            .map_err(|e| format!("Failed to read backup directory: {}", e))? {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();

            if path.extension().map_or(false, |ext| ext == "db") {
                let metadata = entry.metadata()
                    .map_err(|e| format!("Failed to read metadata: {}", e))?;
                
                let created = metadata.modified()
                    .ok()
                    .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                    .map(|d| Local.timestamp_opt(d.as_secs() as i64, 0).single())
                    .flatten()
                    .unwrap_or_else(|| Local::now());

                let size = metadata.len();
                let filename = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                backups.push(BackupInfo {
                    path,
                    filename,
                    created,
                    size,
                });
            }
        }

        // Sort by created date (newest first)
        backups.sort_by(|a, b| b.created.cmp(&a.created));

        Ok(backups)
    }

    /// Delete a specific backup
    pub fn delete_backup(&self, backup_path: &Path) -> Result<(), String> {
        if backup_path.exists() {
            fs::remove_file(backup_path)
                .map_err(|e| format!("Failed to delete backup: {}", e))?;
        }
        Ok(())
    }

    /// Clean up old backups, keeping only the specified number
    fn cleanup_old_backups(
        &self,
        backup_dir: &Path,
        max_backups: usize,
    ) -> Result<(), String> {
        let backups = self.list_backups(backup_dir)?;

        if backups.len() > max_backups {
            for backup in backups.iter().skip(max_backups) {
                self.delete_backup(&backup.path)?;
            }
        }

        Ok(())
    }

    /// Check if backup is needed based on interval
    pub fn should_backup(
        &self,
        backup_dir: &Path,
        interval_days: u32,
    ) -> Result<bool, String> {
        let backups = self.list_backups(backup_dir)?;

        if backups.is_empty() {
            return Ok(true);
        }

        let latest = &backups[0];
        let now = Local::now();
        let days_since_backup = (now - latest.created).num_days();

        Ok(days_since_backup >= interval_days as i64)
    }

    /// Auto backup if needed
    pub fn auto_backup(
        &self,
        db_path: &Path,
        backup_dir: &Path,
        max_backups: usize,
        interval_days: u32,
    ) -> Result<Option<PathBuf>, String> {
        if self.should_backup(backup_dir, interval_days)? {
            let backup_path = self.create_backup(db_path, backup_dir, max_backups)?;
            Ok(Some(backup_path))
        } else {
            Ok(None)
        }
    }
}

#[derive(Debug, Clone)]
pub struct BackupInfo {
    pub path: PathBuf,
    pub filename: String,
    pub created: DateTime<Local>,
    pub size: u64,
}

impl BackupInfo {
    pub fn size_formatted(&self) -> String {
        if self.size < 1024 {
            format!("{} B", self.size)
        } else if self.size < 1024 * 1024 {
            format!("{:.1} KB", self.size as f64 / 1024.0)
        } else {
            format!("{:.1} MB", self.size as f64 / (1024.0 * 1024.0))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::TempDir;

    #[test]
    fn test_backup_and_restore() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let backup_dir = temp_dir.path().join("backups");

        // Create a dummy database file
        File::create(&db_path).unwrap();
        fs::write(&db_path, b"test data").unwrap();

        let service = BackupService::new();
        
        // Create backup
        let backup_path = service.create_backup(&db_path, &backup_dir, 5).unwrap();
        assert!(backup_path.exists());

        // Restore backup
        let restore_path = temp_dir.path().join("restored.db");
        service.restore_backup(&backup_path, &restore_path).unwrap();
        
        let restored_data = fs::read(&restore_path).unwrap();
        assert_eq!(restored_data, b"test data");
    }

    #[test]
    fn test_backup_cleanup() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let backup_dir = temp_dir.path().join("backups");

        File::create(&db_path).unwrap();

        let service = BackupService::new();

        // Create 5 backups
        for _ in 0..5 {
            service.create_backup(&db_path, &backup_dir, 5).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(100));
        }

        let backups = service.list_backups(&backup_dir).unwrap();
        assert_eq!(backups.len(), 5);

        // Create 6th backup with max_backups=3
        service.create_backup(&db_path, &backup_dir, 3).unwrap();
        
        let backups = service.list_backups(&backup_dir).unwrap();
        assert_eq!(backups.len(), 3); // Should have cleaned up old ones
    }
}
