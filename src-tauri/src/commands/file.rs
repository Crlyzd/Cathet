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

const FILTER_ALL_SUPPORTED: &[&str] = &[
    "txt", "md", "markdown", "log", "rtf", "html", "htm", "json", "yaml", "yml", "toml",
    "xml", "ini", "env", "cfg", "csv", "tsv", "js", "ts", "rs", "py", "css", "sql",
    "sh", "bat", "ps1", "c", "cpp", "h",
];
const FILTER_MARKDOWN: &[&str] = &["md", "markdown"];
const FILTER_TEXT_LOGS: &[&str] = &["txt", "log", "rtf"];
const FILTER_DATA_CONFIG: &[&str] = &["json", "yaml", "yml", "toml", "xml", "ini", "env", "cfg", "csv", "tsv"];
const FILTER_CODE: &[&str] = &["js", "ts", "rs", "py", "html", "htm", "css", "sql", "sh", "bat", "ps1", "c", "cpp", "h"];
const FILTER_ALL: &[&str] = &["*"];

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<FilePayload, String> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf).map_err(|e| e.to_string())?;
    let content = fs::read_to_string(&path_buf).map_err(|e| {
        if e.kind() == std::io::ErrorKind::InvalidData {
            "This file contains binary data or an unsupported encoding. Cathet supports UTF-8 plain text and markdown documents.".to_string()
        } else {
            e.to_string()
        }
    })?;

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

    app_handle
        .dialog()
        .file()
        .add_filter("Supported Text Files", FILTER_ALL_SUPPORTED)
        .add_filter("Markdown Documents", FILTER_MARKDOWN)
        .add_filter("Plain Text & Logs", FILTER_TEXT_LOGS)
        .add_filter("Data & Config Files", FILTER_DATA_CONFIG)
        .add_filter("Source Code & Scripts", FILTER_CODE)
        .add_filter("All Files", FILTER_ALL)
        .pick_file(move |file_path| {
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
        .add_filter("Supported Text Files", FILTER_ALL_SUPPORTED)
        .add_filter("Markdown Documents", FILTER_MARKDOWN)
        .add_filter("Plain Text & Logs", FILTER_TEXT_LOGS)
        .add_filter("Data & Config Files", FILTER_DATA_CONFIG)
        .add_filter("Source Code & Scripts", FILTER_CODE)
        .add_filter("All Files", FILTER_ALL)
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
            if arg == "--replace-old" || arg == "--cleanup-update" {
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

