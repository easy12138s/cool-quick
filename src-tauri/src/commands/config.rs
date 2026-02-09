use crate::config::AppConfig;
use crate::shortcut;
use tauri::{command, AppHandle, Manager};

#[command]
pub async fn config_get() -> Result<AppConfig, String> {
    AppConfig::load()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn config_update(
    app: AppHandle,
    new_config: AppConfig,
) -> Result<(), String> {
    // 先保存配置
    new_config.save()
        .map_err(|e| e.to_string())?;

    // 更新快捷键（因为快捷键可能已变更）
    if let Err(e) = shortcut::update_shortcuts(&app, &new_config) {
        eprintln!("Failed to update shortcuts: {}", e);
        // 不返回错误，因为配置已保存成功
    }

    // 发送配置更新事件通知其他窗口
    let _ = app.emit_all("config-updated", &new_config);

    Ok(())
}

#[command]
pub async fn config_reset(app: AppHandle) -> Result<AppConfig, String> {
    let default = AppConfig::default();
    default.save().map_err(|e| e.to_string())?;

    // 重置快捷键
    if let Err(e) = shortcut::update_shortcuts(&app, &default) {
        eprintln!("Failed to reset shortcuts: {}", e);
    }

    // 发送配置更新事件
    let _ = app.emit_all("config-updated", &default);

    Ok(default)
}

#[command]
pub async fn config_update_shortcuts(
    app: AppHandle,
    search_shortcut: String,
    paste_shortcut: String,
) -> Result<(), String> {
    // 加载当前配置
    let mut config = AppConfig::load()
        .map_err(|e| e.to_string())?;

    // 更新快捷键配置
    config.shortcut_search = search_shortcut;
    config.shortcut_paste_last = paste_shortcut;

    // 保存配置
    config.save()
        .map_err(|e| e.to_string())?;

    // 重新注册快捷键
    if let Err(e) = shortcut::update_shortcuts(&app, &config) {
        return Err(format!("Failed to update shortcuts: {}", e));
    }

    // 发送配置更新事件
    let _ = app.emit_all("config-updated", &config);

    Ok(())
}

/// 验证快捷键格式是否有效
#[command]
pub async fn config_validate_shortcut(shortcut: String) -> Result<bool, String> {
    // 简化的验证：检查是否包含必要的修饰键
    let normalized = shortcut.to_lowercase();
    let has_modifier = normalized.contains("ctrl") 
        || normalized.contains("alt") 
        || normalized.contains("shift")
        || normalized.contains("command")
        || normalized.contains("cmd")
        || normalized.contains("meta");
    
    let has_key = normalized.chars().any(|c| c.is_ascii_alphabetic() || c.is_ascii_digit())
        || normalized.contains("f1") || normalized.contains("f2") || normalized.contains("f3")
        || normalized.contains("f4") || normalized.contains("f5") || normalized.contains("f6")
        || normalized.contains("f7") || normalized.contains("f8") || normalized.contains("f9")
        || normalized.contains("f10") || normalized.contains("f11") || normalized.contains("f12");

    Ok(has_modifier && has_key)
}