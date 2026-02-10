use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use crate::config::AppConfig;
use crate::database::Database;

/// 启动自动归档后台任务
pub fn start_auto_archive_task(app: AppHandle, db: Arc<Database>, _config: AppConfig) {
    thread::spawn(move || {
        // 每小时检查一次是否需要归档
        let check_interval = Duration::from_secs(3600); // 1小时
        
        loop {
            let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());

            // 检查配置是否启用自动归档
            if config.archive_after_days > 0 {
                // 执行归档
                match db.archive_notes_by_date(config.archive_after_days, config.never_archive_favorites) {
                    Ok(count) => {
                        if count > 0 {
                            println!("Auto archived {} notes", count);
                            // 发送事件通知前端
                            let _ = app.emit_all("notes-auto-archived", serde_json::json!({
                                "count": count,
                                "days": config.archive_after_days
                            }));
                        }
                    }
                    Err(e) => {
                        eprintln!("Auto archive failed: {}", e);
                    }
                }
            }
            
            thread::sleep(check_interval);
        }
    });
}

/// 手动触发归档
pub fn trigger_archive(db: Arc<Database>, days: i64) -> Result<i64, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    db.archive_notes_by_date(days, config.never_archive_favorites)
        .map_err(|e| format!("Archive failed: {}", e))
}
