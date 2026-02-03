use std::sync::Arc;
use tauri::{generate_context, generate_handler, Builder, Manager, SystemTray, SystemTrayEvent, WindowEvent, GlobalShortcutManager};
use tauri::SystemTrayMenu;

mod clipboard;
mod commands;
mod config;
mod database;
mod detector;
mod models;
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

    // Create system tray menu
    let tray_menu = SystemTrayMenu::new()
        .add_item(tauri::CustomMenuItem::new("show", "Show"))
        .add_item(tauri::CustomMenuItem::new("settings", "Settings"))
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(tauri::CustomMenuItem::new("quit", "Quit"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    Builder::default()
        .manage(db.clone())
        .manage(config.clone())
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                window::toggle_floating_window(app);
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => window::toggle_floating_window(app),
                "settings" => window::show_settings_window(app),
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                event.window().hide().unwrap();
            }
            _ => {}
        })
        .invoke_handler(generate_handler![
            // Notes commands
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
            // Config commands
            commands::config::config_get,
            commands::config::config_update,
            commands::config::config_reset,
            // Clipboard commands
            commands::clipboard::clipboard_get_text,
            commands::clipboard::clipboard_set_text,
            commands::clipboard::clipboard_get_history,
            // Window commands
            commands::window::window_show_floating,
            commands::window::window_hide_floating,
            commands::window::window_toggle_floating,
            commands::window::window_show_drawer,
            commands::window::window_hide_drawer,
            commands::window::window_show_settings,
            commands::window::window_start_drag,
            commands::window::window_set_position,
        ])
        .setup(|app| {
            let app_handle = app.handle();
            
            // Register global shortcuts
            let shortcut_manager = app_handle.global_shortcut_manager();
            
            // Ctrl+Shift+V - Open search
            let app_handle_search = app_handle.clone();
            shortcut_manager
                .register("Ctrl+Shift+V", move || {
                    window::show_floating_window(&app_handle_search);
                    // Emit event to open search
                    app_handle_search.emit_all("open-search", ()).unwrap();
                })
                .unwrap_or_else(|e| eprintln!("Failed to register shortcut: {}", e));
            
            // Ctrl+Shift+1 - Paste last note
            let app_handle_paste = app_handle.clone();
            shortcut_manager
                .register("Ctrl+Shift+1", move || {
                    // Get last note and paste
                    let db = app_handle_paste.state::<Arc<Database>>().inner();
                    if let Ok(notes) = db.get_recently_used_notes(1) {
                        if let Some(note) = notes.get(0) {
                            let _ = commands::clipboard::clipboard_set_text(note.content.clone());
                        }
                    }
                })
                .unwrap_or_else(|e| eprintln!("Failed to register shortcut: {}", e));
            
            // Initialize clipboard monitoring
            let db_clone = db.clone();
            let config_clone = config.clone();
            
            std::thread::spawn(move || {
                let mut manager = ClipboardManager::new(db_clone, config_clone, app_handle);
                manager.start_monitoring();
            });
            
            Ok(())
        })
        .run(generate_context!())
        .expect("error while running tauri application");
}
