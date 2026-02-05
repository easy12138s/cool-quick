use tauri::{command, AppHandle, Manager};

#[command]
pub async fn window_show_floating(app: AppHandle) -> Result<(), String> {
    crate::window::show_floating_window(&app);
    Ok(())
}

#[command]
pub async fn window_hide_floating(app: AppHandle) -> Result<(), String> {
    crate::window::hide_floating_window(&app);
    Ok(())
}

#[command]
pub async fn window_toggle_floating(app: AppHandle) -> Result<(), String> {
    crate::window::toggle_floating_window(&app);
    Ok(())
}

#[command]
pub async fn window_show_drawer(app: AppHandle) -> Result<(), String> {
    crate::window::toggle_drawer_window(&app);
    Ok(())
}

#[command]
pub async fn window_hide_drawer(app: AppHandle) -> Result<(), String> {
    crate::window::hide_drawer_window(&app);
    Ok(())
}

#[command]
pub async fn window_show_settings(app: AppHandle) -> Result<(), String> {
  crate::window::show_settings_window(&app);
  Ok(())
}

#[command]
pub async fn window_show_main(app: AppHandle) -> Result<(), String> {
  crate::window::show_main_window(&app);
  Ok(())
}

#[command]
pub async fn window_start_drag(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_window("floating") {
        window.start_dragging()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn window_set_position(
    app: AppHandle,
    x: f64,
    y: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_window("floating") {
        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: x as i32, y: y as i32 }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn window_hide_popup(app: AppHandle) -> Result<(), String> {
  crate::window::hide_popup_window(&app);
  Ok(())
}

#[command]
pub async fn window_start_dragging(app: AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_window("floating") {
    window.start_dragging().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[command]
pub async fn window_is_visible(app: AppHandle, label: String) -> Result<bool, String> {
  if let Some(window) = app.get_window(&label) {
    return window.is_visible().map_err(|e| e.to_string());
  }
  Ok(false)
}