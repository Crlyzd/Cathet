use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::{App, AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePayload {
    pub path: String,
    pub content: String,
    pub file_size: u64,
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<FilePayload, String> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf).map_err(|e| e.to_string())?;
    let content = fs::read_to_string(&path_buf).map_err(|e| e.to_string())?;

    Ok(FilePayload {
        path,
        content,
        file_size: metadata.len(),
    })
}

#[tauri::command]
pub async fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_open_dialog(app_handle: AppHandle) -> Result<Option<FilePayload>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app_handle.dialog().file().pick_file(move |file_path| {
        let _ = tx.send(file_path);
    });

    let selected = rx.await.map_err(|e| e.to_string())?;

    if let Some(path_buf) = selected {
        let path_str = path_buf.to_string();
        let payload = read_text_file(path_str).await?;
        Ok(Some(payload))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn show_save_dialog(app_handle: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app_handle
        .dialog()
        .file()
        .add_filter("Text Files", &["txt", "md", "log", "rtf", "html"])
        .add_filter("All Files", &["*"])
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let selected = rx.await.map_err(|e| e.to_string())?;

    if let Some(path_buf) = selected {
        Ok(Some(path_buf.to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_initial_file(state: State<'_, AppState>) -> Result<Option<FilePayload>, String> {
    let path_opt = {
        let mut guard = state.current_file_path.lock().map_err(|e| e.to_string())?;
        guard.take()
    };

    if let Some(path_buf) = path_opt {
        let path_str = path_buf.to_string_lossy().to_string();
        let payload = read_text_file(path_str).await?;
        Ok(Some(payload))
    } else {
        Ok(None)
    }
}

/// Inspects command-line arguments for file paths (e.g. Windows file associations or Open With).
pub fn init_cli_file(app: &App) {
    let args: Vec<String> = std::env::args().collect();
    let mut file_args = Vec::new();
    let mut skip_next = false;

    for arg in args.into_iter().skip(1) {
        if skip_next {
            skip_next = false;
            continue;
        }
        if arg.starts_with('-') {
            if arg == "--replace-old" {
                skip_next = true;
            }
            continue;
        }
        let clean = arg.trim_matches('"').trim_matches('\'');
        let p = PathBuf::from(clean);
        let resolved = if p.is_relative() {
            std::env::current_dir().map(|cwd| cwd.join(&p)).unwrap_or(p)
        } else {
            p
        };
        if resolved.exists() && resolved.is_file() {
            let path_str = resolved.to_string_lossy().to_string();
            let clean_path = path_str.strip_prefix(r"\\?\").unwrap_or(&path_str).to_string();
            file_args.push(clean_path);
        }
    }

    if let Some(first_file) = file_args.first() {
        let state = app.state::<AppState>();
        if let Ok(mut guard) = state.current_file_path.lock() {
            *guard = Some(PathBuf::from(first_file));
        }

        // If multiple files were passed in a single CLI invocation, spawn companion instances
        if file_args.len() > 1 {
            if let Ok(exe) = std::env::current_exe() {
                for extra in &file_args[1..] {
                    let _ = std::process::Command::new(&exe).arg(extra).spawn();
                }
            }
        }
    }
}

