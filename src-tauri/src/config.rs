#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
  pub db_path: String,
  pub auto_start: bool,
  pub min_popup_length: usize,
  pub popup_auto_close_seconds: u64,
  pub floating_window_size: u32,
  pub floating_window_opacity: f32,
  #[serde(default = "default_true")]
  pub floating_visible: bool,
  pub floating_hover_open_drawer: bool,
  pub floating_hover_delay_ms: u64,
  pub floating_hide_drawer_on_drag: bool,
  pub drawer_auto_hide: bool,
  pub drawer_hide_delay_ms: u64,
  pub drawer_default_limit: u32,
  pub drawer_sort: String,
  pub popup_enabled: bool,
  pub popup_types: Vec<String>,
  pub popup_dedupe_window_ms: u64,
  pub save_mode: String,
  pub dedupe_mode: String,
  pub never_archive_favorites: bool,
  pub export_mask_sensitive: bool,
  pub shortcut_search: String,
  pub shortcut_paste_last: String,
  pub shortcut_toggle_drawer: String,
  pub shortcut_toggle_popup: String,
  pub enable_encryption: bool,
  pub archive_after_days: i64,
  pub theme: String,
  pub language: String,
  pub backup_enabled: bool,
  pub backup_interval_days: i64,
}

fn default_true() -> bool {
  true
}

impl Default for AppConfig {
  fn default() -> Self {
    Self {
      db_path: Self::default_db_path(),
      auto_start: false,
      min_popup_length: 20,
      popup_auto_close_seconds: 3,
      floating_window_size: 48,
      floating_window_opacity: 0.9,
      floating_visible: true,
      floating_hover_open_drawer: true,
      floating_hover_delay_ms: 300,
      floating_hide_drawer_on_drag: true,
      drawer_auto_hide: true,
      drawer_hide_delay_ms: 800,
      drawer_default_limit: 10,
      drawer_sort: "recent".to_string(),
      popup_enabled: true,
      popup_types: vec![
        "phone".to_string(),
        "email".to_string(),
        "url".to_string(),
        "code".to_string(),
        "password".to_string(),
        "text".to_string(),
      ],
      popup_dedupe_window_ms: 3000,
      save_mode: "manual".to_string(),
      dedupe_mode: "merge".to_string(),
      never_archive_favorites: true,
      export_mask_sensitive: true,
      shortcut_search: "Ctrl+Shift+V".to_string(),
      shortcut_paste_last: "Ctrl+Shift+1".to_string(),
      shortcut_toggle_drawer: "Ctrl+Shift+D".to_string(),
      shortcut_toggle_popup: "Ctrl+Shift+P".to_string(),
      enable_encryption: false,
      archive_after_days: 7,
      theme: "system".to_string(),
      language: "zh".to_string(),
      backup_enabled: true,
      backup_interval_days: 7,
    }
  }
}

impl AppConfig {
  fn default_db_path() -> String {
    let base_dir = if cfg!(target_os = "windows") {
      PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string()))
    } else if cfg!(target_os = "macos") {
      dirs::home_dir()
        .map(|h| h.join("Library/Application Support"))
        .unwrap_or_else(|| PathBuf::from("."))
    } else {
      dirs::home_dir()
        .map(|h| h.join(".config"))
        .unwrap_or_else(|| PathBuf::from("."))
    };
    let app_dir = base_dir.join("CoolQuick");
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("data.db").to_string_lossy().to_string()
  }

  fn config_path() -> PathBuf {
    let base_dir = if cfg!(target_os = "windows") {
      PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string()))
    } else if cfg!(target_os = "macos") {
      dirs::home_dir()
        .map(|h| h.join("Library/Application Support"))
        .unwrap_or_else(|| PathBuf::from("."))
    } else {
      dirs::home_dir()
        .map(|h| h.join(".config"))
        .unwrap_or_else(|| PathBuf::from("."))
    };
    let app_dir = base_dir.join("CoolQuick");
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("config.json")
  }

  pub fn load() -> anyhow::Result<Self> {
    let path = Self::config_path();
    if path.exists() {
      let content = fs::read_to_string(&path)?;
      let config: AppConfig = serde_json::from_str(&content)?;
      Ok(config)
    } else {
      let config = AppConfig::default();
      config.save()?;
      Ok(config)
    }
  }

  pub fn save(&self) -> anyhow::Result<()> {
    let path = Self::config_path();
    let content = serde_json::to_string_pretty(self)?;
    fs::write(path, content)?;
    Ok(())
  }

  pub fn update<F>(&self, updater: F) -> anyhow::Result<Self>
  where
    F: FnOnce(&mut Self),
  {
    let mut config = self.clone();
    updater(&mut config);
    config.save()?;
    Ok(config)
  }
}
