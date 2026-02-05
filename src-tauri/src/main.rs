use std::sync::Arc;
use tauri::{generate_context, generate_handler, Builder, Manager};

mod clipboard;
mod commands;
mod config;
mod database;
mod detector;
mod models;
mod services;
mod window;

use clipboard::ClipboardManager;
use config::AppConfig;
use database::Database;

fn main() {
    // Initialize configuration
    let config = AppConfig::load().expect("Failed to load configuration");
    
    // Initialize database
    let db = Database::new(&config.db_path).expect("Failed to initialize database");
    let db = Arc::new(db);

    Builder::default()
        .manage(db.clone())
        .manage(config.clone())
        .invoke_handler(generate_handler![
            commands::notes::notes_get_all,
            commands::notes::notes_get_by_id,
            commands::notes::notes_create,
            commands::notes::notes_update,
            commands::notes::notes_delete,
            commands::notes::notes_search,
            commands::notes::notes_get_archived,
            commands::notes::notes_archive,
            commands::notes::notes_unarchive,
            commands::notes::notes_export,
            commands::notes::notes_import,
            commands::notes::notes_get_stats,
            commands::config::config_get,
            commands::config::config_update,
            commands::config::config_reset,
            commands::clipboard::clipboard_get_text,
            commands::clipboard::clipboard_set_text,
            commands::clipboard::clipboard_get_history,
commands::window::window_show_floating,
      commands::window::window_hide_floating,
      commands::window::window_toggle_floating,
      commands::window::window_show_drawer,
      commands::window::window_hide_drawer,
      commands::window::window_show_settings,
      commands::window::window_show_main,
      commands::window::window_start_drag,
      commands::window::window_set_position,
      commands::window::window_hide_popup,
      commands::window::window_start_dragging,
      commands::window::window_is_visible,
    ])
.setup(move |app| {
    let app_handle = app.handle();
    
    // 延迟设置窗口关闭监听，确保窗口已完全创建
    let app_handle_clone = app_handle.clone();
    std::thread::spawn(move || {
      std::thread::sleep(std::time::Duration::from_millis(100));
      if let Some(main_window) = app_handle_clone.get_window("main") {
        main_window.on_window_event(move |event| {
          if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            std::process::exit(0);
          }
        });
      }
    });

    std::thread::spawn(move || {
      let mut manager = ClipboardManager::new(db, config, app_handle);
      manager.start_monitoring();
    });

    Ok(())
  })
        .run(generate_context!())
        .expect("error while running tauri application");
}
