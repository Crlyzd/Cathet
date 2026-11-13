pub mod commands;
pub mod encoding;
pub mod state;

use commands::association::{
    configure_default_app, get_association_status, unregister_default_app,
};
use commands::biometric::authenticate_biometric;
#[cfg(target_os = "windows")]
use commands::association::self_heal_if_moved;
use commands::file::{
    get_initial_file, get_pending_commit_image, init_cli_file, is_file_readonly,
    read_clipboard_image, read_text_file, show_open_dialog, show_save_dialog, write_text_file,
};
use commands::notes::{
    create_folder, delete_folder, delete_notes, import_external_file, list_notes, move_notes,
    read_note, rename_folder, rename_note, save_note, set_note_hidden, set_note_pinned,
};
use commands::memory::trim_memory;
use commands::linux_desktop::get_linux_desktop_info;
use commands::updater::{
    check_for_updates, download_and_install_update, download_update_payload, install_and_restart,
};
#[cfg(desktop)]
use commands::vibrancy::{apply_frosted_glass, get_windows_accent_color, set_window_backdrop};
#[cfg(not(desktop))]
use commands::vibrancy::{get_windows_accent_color, set_window_backdrop};
use commands::window::{
    focus_main_window, get_always_on_top, open_new_instance, open_settings_window,
    set_always_on_top, set_refresh_rate, set_window_min_size, sync_window_theme,
    toggle_always_on_top,
};
use state::AppState;
#[cfg(desktop)]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            #[cfg(desktop)]
            if let Some(main_window) = app.get_webview_window("main") {
                apply_frosted_glass(&main_window);
            }
            init_cli_file(app);
            #[cfg(target_os = "windows")]
            self_heal_if_moved();

            // Trim initial startup heap & working set spike once UI stabilizes
            #[cfg(target_os = "windows")]
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(2200)).await;
                trim_memory();
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            match event {
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                    if window.label() == "main" {
                        if let Some(settings_win) = window.app_handle().get_webview_window("settings") {
                            let _ = settings_win.destroy();
                        }
                    } else if window.label() == "settings" {
                        #[cfg(target_os = "windows")]
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                            trim_memory();
                        });
                    }
                }
                tauri::WindowEvent::Resized(..) => {
                    if window.label() == "main" {
                        let app_state = window.state::<AppState>();
                        let is_max = window.is_maximized().unwrap_or(false);
                        let is_full = window.is_fullscreen().unwrap_or(false);
                        let was_max = app_state.was_maximized.load(std::sync::atomic::Ordering::Relaxed);

                        if was_max && !is_max && !is_full {
                            app_state.was_maximized.store(false, std::sync::atomic::Ordering::Relaxed);
                            if let Ok(target_guard) = app_state.target_min_size.lock() {
                                if let Some((width, height)) = *target_guard {
                                    let _ = window.set_min_size(Some(tauri::LogicalSize::new(width, height)));
                                    if let (Ok(current_size), Ok(scale_factor)) = (window.inner_size(), window.scale_factor()) {
                                        let logical_current = current_size.to_logical::<f64>(scale_factor);
                                        if logical_current.width < width || logical_current.height < height {
                                            let new_w = logical_current.width.max(width);
                                            let new_h = logical_current.height.max(height);
                                            let _ = window.set_size(tauri::LogicalSize::new(new_w, new_h));
                                        }
                                    }
                                }
                            }
                        } else if is_max || is_full {
                            app_state.was_maximized.store(true, std::sync::atomic::Ordering::Relaxed);
                        }
                    }
                }
                #[cfg(target_os = "windows")]
                tauri::WindowEvent::Focused(false) => {
                    trim_memory();
                }
                _ => {}
            }
            #[cfg(not(desktop))]
            {
                let _ = (window, event);
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            read_clipboard_image,
            get_pending_commit_image,
            write_text_file,
            is_file_readonly,
            show_open_dialog,
            show_save_dialog,
            get_initial_file,
            toggle_always_on_top,
            get_always_on_top,
            set_always_on_top,
            open_new_instance,
            open_settings_window,
            focus_main_window,
            set_window_min_size,
            set_refresh_rate,
            get_linux_desktop_info,
            sync_window_theme,
            check_for_updates,
            download_and_install_update,
            download_update_payload,
            install_and_restart,
            trim_memory,
            get_association_status,
            configure_default_app,
            unregister_default_app,
            list_notes,
            read_note,
            save_note,
            rename_note,
            delete_notes,
            move_notes,
            set_note_pinned,
            set_note_hidden,
            create_folder,
            rename_folder,
            delete_folder,
            import_external_file,
            authenticate_biometric,
            set_window_backdrop,
            get_windows_accent_color
        ])
        .run(tauri::generate_context!())
        .expect("error while running cathet application");
}
