pub mod commands;
pub mod encoding;
pub mod state;

use commands::association::{
    configure_default_app, get_association_status, unregister_default_app,
};
#[cfg(target_os = "windows")]
use commands::association::self_heal_if_moved;
use commands::file::{
    get_initial_file, get_pending_commit_image, init_cli_file, is_file_readonly,
    read_clipboard_image, read_text_file, show_open_dialog, show_save_dialog, write_text_file,
};
use commands::notes::{
    create_folder, delete_notes, import_external_file, list_notes, move_notes, read_note,
    rename_note, save_note, set_note_hidden, set_note_pinned,
};
use commands::memory::trim_memory;
use commands::updater::{
    check_for_updates, download_and_install_update, download_update_payload, install_and_restart,
};
#[cfg(desktop)]
use commands::vibrancy::apply_frosted_glass;
use commands::window::{
    focus_main_window, get_always_on_top, open_new_instance, open_settings_window,
    set_always_on_top, set_refresh_rate, set_window_min_size, sync_window_theme, toggle_always_on_top,
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
            import_external_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running cathet application");
}
