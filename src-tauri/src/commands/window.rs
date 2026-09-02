use std::process::Command;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};

use crate::state::AppState;

#[tauri::command]
pub async fn toggle_always_on_top(
    window: WebviewWindow,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let current = state.is_always_on_top.load(Ordering::Relaxed);
    let new_state = !current;

    window
        .set_always_on_top(new_state)
        .map_err(|e| e.to_string())?;

    state.is_always_on_top.store(new_state, Ordering::Relaxed);
    Ok(new_state)
}

#[tauri::command]
pub async fn get_always_on_top(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.is_always_on_top.load(Ordering::Relaxed))
}

#[tauri::command]
pub async fn set_always_on_top(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<bool, String> {
    if let Some(main_win) = app_handle.get_webview_window("main") {
        main_win
            .set_always_on_top(enabled)
            .map_err(|e| e.to_string())?;
    }
    state.is_always_on_top.store(enabled, Ordering::Relaxed);
    Ok(enabled)
}

#[tauri::command]
pub async fn open_new_instance(_app_handle: AppHandle) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    Command::new(current_exe)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_settings_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(win) = app_handle.get_webview_window("settings") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
        let _ = win.emit("cathet:settings-focused", ());
        return Ok(());
    }

    let win = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("Cathet — Settings & About")
    .inner_size(350.0, 310.0)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .shadow(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    crate::commands::vibrancy::apply_frosted_glass(&win);

    let _ = win.show();
    let _ = win.set_focus();
    Ok(())
}

#[tauri::command]
pub async fn sync_window_theme(app_handle: AppHandle, theme: String) -> Result<(), String> {
    let is_dark = theme == "dark";
    if let Some(main_win) = app_handle.get_webview_window("main") {
        crate::commands::vibrancy::update_window_theme(&main_win, is_dark);
    }
    if let Some(settings_win) = app_handle.get_webview_window("settings") {
        crate::commands::vibrancy::update_window_theme(&settings_win, is_dark);
    }
    Ok(())
}
