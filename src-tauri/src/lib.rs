pub mod commands;
pub mod state;

use commands::association::{
    configure_default_app, get_association_status, self_heal_if_moved, unregister_default_app,
};
use commands::file::{
    get_initial_file, init_cli_file, read_text_file, show_open_dialog, show_save_dialog,
    write_text_file,
};
use commands::memory::trim_memory;
use commands::updater::{
    check_for_updates, download_and_install_update, download_update_payload, install_and_restart,
};
use commands::vibrancy::apply_frosted_glass;
use commands::window::{
    get_always_on_top, open_new_instance, open_settings_window, set_always_on_top,
    sync_window_theme, toggle_always_on_top,
};
use state::AppState;
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
            if let Some(main_window) = app.get_webview_window("main") {
                apply_frosted_glass(&main_window);
            }
            init_cli_file(app);
            self_heal_if_moved();

            // Trim initial startup heap & working set spike once UI stabilizes
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(2200)).await;
                trim_memory();
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                match event {
                    tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                        if let Some(settings_win) = window.app_handle().get_webview_window("settings") {
                            let _ = settings_win.destroy();
                        }
                    }
                    tauri::WindowEvent::Focused(false) => {
                        trim_memory();
                    }
                    _ => {}
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            show_open_dialog,
            show_save_dialog,
            get_initial_file,
            toggle_always_on_top,
            get_always_on_top,
            set_always_on_top,
            open_new_instance,
            open_settings_window,
            sync_window_theme,
            check_for_updates,
            download_and_install_update,
            download_update_payload,
            install_and_restart,
            trim_memory,
            get_association_status,
            configure_default_app,
            unregister_default_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running cathet application");
}
