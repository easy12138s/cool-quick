use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

pub fn toggle_floating_window(app: &AppHandle) {
    if let Some(window) = app.get_window("floating") {
        if window.is_visible().unwrap_or(false) {
            window.hide().unwrap();
        } else {
            window.show().unwrap();
            window.set_focus().unwrap();
        }
    }
}

pub fn show_floating_window(app: &AppHandle) {
    if let Some(window) = app.get_window("floating") {
        window.show().unwrap();
        window.set_focus().unwrap();
    }
}

pub fn hide_floating_window(app: &AppHandle) {
    if let Some(window) = app.get_window("floating") {
        window.hide().unwrap();
    }
}

pub fn show_drawer_window(app: &AppHandle) {
    if let Some(window) = app.get_window("drawer") {
        window.show().unwrap();
    }
}

pub fn hide_drawer_window(app: &AppHandle) {
    if let Some(window) = app.get_window("drawer") {
        window.hide().unwrap();
    }
}

pub fn toggle_drawer_window(app: &AppHandle) {
    if let Some(window) = app.get_window("drawer") {
        if window.is_visible().unwrap_or(false) {
            hide_drawer_window(app);
        } else {
            // Position drawer relative to floating window
            if let Some(floating) = app.get_window("floating") {
                let floating_pos = floating.outer_position().unwrap_or(PhysicalPosition::new(100, 100));
                let floating_size = floating.outer_size().unwrap_or(PhysicalSize::new(60, 60));
                
                // Calculate screen size
                let monitor = floating.current_monitor().unwrap();
                if let Some(monitor) = monitor {
                    let screen_size = monitor.size();
                    let screen_pos = monitor.position();
                    
                    // Determine which edge the floating window is closest to
                    let relative_x = floating_pos.x - screen_pos.x;
                    let _relative_y = floating_pos.y - screen_pos.y;
                    let drawer_width = 350;
                    let drawer_height = 500;
                    
                    // Try to show drawer towards center of screen
                    let (drawer_x, drawer_y) = if relative_x < (screen_size.width as i32) / 2 {
                        // Floating is on left side, show drawer to the right
                        (floating_pos.x + floating_size.width as i32, floating_pos.y)
                    } else {
                        // Floating is on right side, show drawer to the left
                        (floating_pos.x - drawer_width, floating_pos.y)
                    };
                    
                    // Ensure drawer doesn't go off-screen
                    let final_x = drawer_x.max(screen_pos.x).min(screen_pos.x + screen_size.width as i32 - drawer_width);
                    let final_y = drawer_y.max(screen_pos.y).min(screen_pos.y + screen_size.height as i32 - drawer_height);
                    
                    window.set_position(PhysicalPosition::new(final_x, final_y)).unwrap();
                }
            }
            show_drawer_window(app);
        }
    }
}

pub fn show_popup_window(app: &AppHandle, content: &str, content_type: &str) {
    // Emit event to show popup
    app.emit_all("show-popup", serde_json::json!({
        "content": content,
        "type": content_type,
    })).unwrap();
    
    if let Some(window) = app.get_window("popup") {
        let popup_width = 360;
        let popup_height = 200;
        let taskbar_height = 60; // 任务栏高度预留
        
        // Check if floating window is visible
        let floating_visible = app.get_window("floating")
            .map(|w| w.is_visible().unwrap_or(false))
            .unwrap_or(false);
        
        if floating_visible {
            // Position popup relative to floating window
            if let Some(floating) = app.get_window("floating") {
                let floating_pos = floating.outer_position().unwrap_or(PhysicalPosition::new(100, 100));
                let floating_size = floating.outer_size().unwrap_or(PhysicalSize::new(60, 60));
                
                let monitor = floating.current_monitor().unwrap();
                if let Some(monitor) = monitor {
                    let screen_size = monitor.size();
                    let screen_pos = monitor.position();
                    
                    let relative_x = floating_pos.x - screen_pos.x;
                    
                    // Show popup towards center
                    let (popup_x, popup_y) = if relative_x < (screen_size.width as i32) / 2 {
                        (floating_pos.x + floating_size.width as i32 + 10, floating_pos.y)
                    } else {
                        (floating_pos.x - popup_width - 10, floating_pos.y)
                    };
                    
                    let final_x = popup_x.max(screen_pos.x).min(screen_pos.x + screen_size.width as i32 - popup_width);
                    let final_y = popup_y.max(screen_pos.y).min(screen_pos.y + screen_size.height as i32 - popup_height);
                    
                    window.set_position(PhysicalPosition::new(final_x, final_y)).unwrap();
                }
            }
        } else {
            // Floating window hidden, show popup at bottom-right corner (above taskbar)
            if let Ok(Some(monitor)) = window.primary_monitor() {
                let screen_size = monitor.size();
                let screen_pos = monitor.position();
                
                // Calculate position: bottom-right corner, above taskbar
                let popup_x = screen_pos.x + screen_size.width as i32 - popup_width - 20;
                let popup_y = screen_pos.y + screen_size.height as i32 - popup_height - taskbar_height - 10;
                
                window.set_position(PhysicalPosition::new(popup_x, popup_y)).unwrap();
            }
        }
        
        window.show().unwrap();
        window.set_focus().unwrap();
    }
}

pub fn hide_popup_window(app: &AppHandle) {
    if let Some(window) = app.get_window("popup") {
        window.hide().unwrap();
    }
}

pub fn show_settings_window(app: &AppHandle) {
  if let Some(window) = app.get_window("settings") {
    window.show().unwrap();
    window.set_focus().unwrap();
    window.center().unwrap();
  }
}

pub fn show_main_window(app: &AppHandle) {
  if let Some(window) = app.get_window("main") {
    window.show().unwrap();
    window.set_focus().unwrap();
  }
}
