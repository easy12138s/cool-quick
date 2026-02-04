use std::sync::Arc;
use tauri::{generate_context, generate_handler, Builder};

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
    ])
.setup(move |app| {
    let app_handle = app.handle();
    
    // 监听主窗口关闭事件，关闭时退出应用
    let main_window = app.get_window("main").expect("Main window not found");
    let app_handle_clone = app_handle.clone();
    main_window.on_window_event(move |event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        app_handle_clone.exit(0);
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
