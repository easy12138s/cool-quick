use crate::config::AppConfig;
use std::sync::Arc;
use tauri::{command, State};

#[command]
pub async fn config_get() -> Result<AppConfig, String> {
    AppConfig::load()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn config_update(
    new_config: AppConfig,
) -> Result<(), String> {
    new_config.save()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn config_reset() -> Result<AppConfig, String> {
    let default = AppConfig::default();
    default.save().map_err(|e| e.to_string())?;
    Ok(default)
}