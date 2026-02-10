use std::sync::Arc;
use tauri::{AppHandle, GlobalShortcutManager, Manager};
use crate::config::AppConfig;
use crate::database::Database;
use crate::clipboard::skip_next_clipboard_event;
use crate::window;
use arboard::Clipboard;

/// 注册所有全局快捷键
pub fn register_global_shortcuts(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let mut shortcut_manager = app.global_shortcut_manager();
    
    // 注册搜索快捷键
    let search_shortcut = config.shortcut_search.clone();
    let app_handle = app.clone();
    shortcut_manager
        .register(&search_shortcut, move || {
            on_search_shortcut(&app_handle);
        })
        .map_err(|e| format!("Failed to register search shortcut: {}", e))?;
    
    // 注册粘贴最近笔记快捷键
    let paste_shortcut = config.shortcut_paste_last.clone();
    let app_handle = app.clone();
    shortcut_manager
        .register(&paste_shortcut, move || {
            on_paste_last_shortcut(&app_handle);
        })
        .map_err(|e| format!("Failed to register paste shortcut: {}", e))?;

    // 注册抽屉开关快捷键
    let toggle_drawer_shortcut = config.shortcut_toggle_drawer.clone();
    if !toggle_drawer_shortcut.trim().is_empty() {
        let app_handle = app.clone();
        shortcut_manager
            .register(&toggle_drawer_shortcut, move || {
                window::toggle_drawer_window(&app_handle);
            })
            .map_err(|e| format!("Failed to register toggle drawer shortcut: {}", e))?;
    }

    // 注册弹窗提示开关快捷键
    let toggle_popup_shortcut = config.shortcut_toggle_popup.clone();
    if !toggle_popup_shortcut.trim().is_empty() {
        let app_handle = app.clone();
        shortcut_manager
            .register(&toggle_popup_shortcut, move || {
                on_toggle_popup_shortcut(&app_handle);
            })
            .map_err(|e| format!("Failed to register toggle popup shortcut: {}", e))?;
    }
    
    Ok(())
}

fn on_toggle_popup_shortcut(app: &AppHandle) {
    let mut cfg = AppConfig::load().unwrap_or_default();
    cfg.popup_enabled = !cfg.popup_enabled;
    if cfg.save().is_ok() {
        let _ = app.emit_all("config-updated", &cfg);
    }
}

/// 注销所有全局快捷键
pub fn unregister_all_shortcuts(app: &AppHandle) -> Result<(), String> {
    let mut shortcut_manager = app.global_shortcut_manager();
    shortcut_manager
        .unregister_all()
        .map_err(|e| format!("Failed to unregister shortcuts: {}", e))
}

/// 更新快捷键（当配置变更时调用）
pub fn update_shortcuts(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    unregister_all_shortcuts(app)?;
    register_global_shortcuts(app, config)
}

/// 搜索快捷键回调
fn on_search_shortcut(app: &AppHandle) {
    // 显示主窗口并跳转到搜索页面
    if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        // 发送事件通知前端切换到搜索页
        let _ = window.emit("navigate-to", "/search");
    }
}

/// 粘贴最近笔记快捷键回调
fn on_paste_last_shortcut(app: &AppHandle) {
    // 获取最近的笔记并复制到剪贴板
    if let Some(db) = app.try_state::<Arc<Database>>() {
        match db.get_recently_used_notes(1) {
            Ok(notes) => {
                if let Some(note) = notes.first() {
                    // 跳过下一次剪贴板事件，避免触发弹窗
                    skip_next_clipboard_event();
                    
                    // 复制到剪贴板
                    if let Ok(mut clipboard) = Clipboard::new() {
                        if let Err(e) = clipboard.set_text(&note.content) {
                            eprintln!("Failed to copy note to clipboard: {}", e);
                        } else {
                            // 增加使用计数
                            let _ = db.increment_use_count(&note.id);
                            
                            // 可选：显示通知提示
                            if let Some(window) = app.get_window("main") {
                                let _ = window.emit("note-copied", serde_json::json!({
                                    "id": note.id,
                                    "content": note.content.chars().take(50).collect::<String>()
                                }));
                            }
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to get recent notes: {}", e);
            }
        }
    }
}

/// 解析快捷键字符串为 Tauri 支持的格式
#[allow(dead_code)]
pub fn normalize_shortcut(shortcut: &str) -> String {
    let normalized = shortcut.to_lowercase();
    normalized
        .replace("ctrl", "CommandOrControl")
        .replace("command", "CommandOrControl")
        .replace("cmd", "CommandOrControl")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_shortcut() {
        assert_eq!(normalize_shortcut("Ctrl+Shift+V"), "commandorcontrol+shift+v");
        assert_eq!(normalize_shortcut("Cmd+A"), "commandorcontrol+a");
        assert_eq!(normalize_shortcut("Command+C"), "commandorcontrol+c");
    }
}
