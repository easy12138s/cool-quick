use std::sync::Arc;
use tauri::{generate_context, generate_handler, Builder, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, CustomMenuItem, Icon};

mod archive_task;
mod clipboard;
mod commands;
mod config;
mod database;
mod detector;
mod models;
mod services;
mod shortcut;
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

  // 创建系统托盘菜单
  let tray_menu = SystemTrayMenu::new()
    .add_item(CustomMenuItem::new("show_main", "打开主窗口"))
    .add_native_item(tauri::SystemTrayMenuItem::Separator)
    .add_item(CustomMenuItem::new("settings", "设置"))
    .add_native_item(tauri::SystemTrayMenuItem::Separator)
    .add_item(CustomMenuItem::new("quit", "退出"));

  Builder::default()
    .manage(db.clone())
    .manage(config.clone())
    .system_tray(SystemTray::new().with_menu(tray_menu))
    .on_system_tray_event(|app, event| {
      match event {
        SystemTrayEvent::MenuItemClick { id, .. } => {
          match id.as_str() {
            "show_main" => {
              if let Some(window) = app.get_window("main") {
                window.show().unwrap();
                window.set_focus().unwrap();
              }
            }
            "settings" => {
              crate::window::show_settings_window(app);
            }
            "quit" => {
              std::process::exit(0);
            }
            _ => {}
          }
        }
        SystemTrayEvent::LeftClick { .. } => {
          // 点击托盘图标打开主窗口
          if let Some(window) = app.get_window("main") {
            if window.is_visible().unwrap_or(false) {
              window.hide().unwrap();
            } else {
              window.show().unwrap();
              window.set_focus().unwrap();
            }
          }
        }
        _ => {}
      }
    })
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
      commands::notes::notes_trigger_archive,
      commands::config::config_get,
      commands::config::config_update,
      commands::config::config_reset,
      commands::config::config_update_shortcuts,
      commands::config::config_validate_shortcut,
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

      let app_icon_ico = Icon::Raw(include_bytes!("../icons/icon.ico").to_vec());
      for label in ["main", "floating", "drawer", "popup"] {
        if let Some(window) = app.get_window(label) {
          let _ = window.set_icon(app_icon_ico.clone());
        }
      }
      let _ = app.tray_handle().set_icon(Icon::Raw(include_bytes!("../icons/icon.png").to_vec()));
      
      // 注册全局快捷键
      if let Err(e) = shortcut::register_global_shortcuts(&app_handle, &config) {
        eprintln!("Failed to register global shortcuts: {}", e);
      }

      // 启动自动归档任务
      archive_task::start_auto_archive_task(app_handle.clone(), db.clone(), config.clone());

      // 设置悬浮球初始位置到屏幕右侧
      if let Some(floating_window) = app.get_window("floating") {
        // 获取主显示器
        if let Ok(Some(monitor)) = floating_window.primary_monitor() {
          let screen_width = monitor.size().width as i32;
          let screen_height = monitor.size().height as i32;
          
          // 计算右侧位置（距离右边缘 20px，垂直居中）
          let x = screen_width - 56 - 20;
          let y = (screen_height - 56) / 2;
          
          floating_window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y })).unwrap();
        }
        
        // 根据配置显示或隐藏悬浮球
        if config.floating_visible {
          floating_window.show().unwrap();
          floating_window.set_focus().unwrap();
        } else {
          floating_window.hide().unwrap();
        }
      }
      
      // 监听主窗口关闭事件，关闭时隐藏窗口而非退出应用
      let app_handle_clone = app_handle.clone();
      std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(100));
        if let Some(main_window) = app_handle_clone.get_window("main") {
          let main_window_clone = main_window.clone();
          main_window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
              api.prevent_close();
              main_window_clone.hide().unwrap();
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
