pub mod commands;
pub mod state;

use commands::file::{read_text_file, show_open_dialog, show_save_dialog, write_text_file};
use commands::window::{apply_frosted_glass, open_new_instance, toggle_always_on_top};
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            show_open_dialog,
            show_save_dialog,
            toggle_always_on_top,
            open_new_instance
        ])
        .run(tauri::generate_context!())
        .expect("error while running cleanpad application");
}
