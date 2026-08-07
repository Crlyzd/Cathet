use std::process::Command;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, State, WebviewWindow};
use window_vibrancy::{apply_acrylic, apply_blur, apply_mica};

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
pub async fn open_new_instance(_app_handle: AppHandle) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    Command::new(current_exe)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn apply_frosted_glass(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        if let Err(_) = apply_acrylic(window, Some((20, 20, 20, 120))) {
            if let Err(_) = apply_mica(window, Some(true)) {
                let _ = apply_blur(window, Some((20, 20, 20, 120)));
            }
        }
    }
}
