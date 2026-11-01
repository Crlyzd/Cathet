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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardImagePayload {
    pub mime_type: String,
    pub bytes: Vec<u8>,
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

use crate::encoding::decode_text_bytes;

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<FilePayload, String> {
    if path.starts_with("content://") || (cfg!(target_os = "android") && path.starts_with("file://")) {
        let (display_name, raw_bytes) = crate::commands::android_fs::read_content_uri(&path)?;
        let content = decode_text_bytes(&raw_bytes)?;
        let file_size = raw_bytes.len() as u64;
        return Ok(FilePayload {
            path,
            content,
            file_size,
            display_name: Some(display_name),
        });
    }

    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf).map_err(|e| e.to_string())?;
    let raw_bytes = fs::read(&path_buf).map_err(|e| e.to_string())?;
    let content = decode_text_bytes(&raw_bytes)?;

    Ok(FilePayload {
        path,
        content,
        file_size: metadata.len(),
        display_name: None,
    })
}

#[tauri::command]
pub async fn write_text_file(path: String, content: String) -> Result<(), String> {
    if path.starts_with("content://") || (cfg!(target_os = "android") && path.starts_with("file://")) {
        return crate::commands::android_fs::write_content_uri(&path, content.as_bytes());
    }
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn is_file_readonly(path: String) -> Result<bool, String> {
    if path.starts_with("content://") || (cfg!(target_os = "android") && path.starts_with("file://")) {
        return Ok(false);
    }
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    Ok(metadata.permissions().readonly())
}

#[tauri::command]
pub async fn show_open_dialog(app_handle: AppHandle) -> Result<Option<FilePayload>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    let builder = app_handle.dialog().file();
    #[cfg(not(target_os = "android"))]
    let builder = builder
        .add_filter("All Supported Documents", FILTER_ALL_SUPPORTED)
        .add_filter("Markdown (*.md)", FILTER_MARKDOWN)
        .add_filter("Text & Logs (*.txt, *.log)", FILTER_TEXT_LOGS)
        .add_filter("Data & Config (*.json, *.yaml, *.toml, ...)", FILTER_DATA_CONFIG)
        .add_filter("Source Code (*.js, *.ts, *.rs, *.py, ...)", FILTER_CODE)
        .add_filter("All Files (*.*)", FILTER_ALL);

    builder.pick_file(move |file_path| {
        let _ = tx.send(file_path);
    });

    let selected = rx.await.map_err(|e| e.to_string())?;

    if let Some(path) = selected {
        let path_str = path.to_string();
        read_text_file(path_str).await.map(Some)
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn show_save_dialog(
    app_handle: AppHandle,
    default_name: Option<String>,
) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    let target_name = match default_name {
        Some(ref name) if !name.trim().is_empty() => {
            if !name.contains('.') { format!("{}.txt", name.trim()) } else { name.trim().to_string() }
        }
        _ => "Untitled.txt".to_string(),
    };

    let builder = app_handle.dialog().file().set_file_name(&target_name);
    #[cfg(not(target_os = "android"))]
    let builder = builder
        .add_filter("Markdown Document (*.md)", FILTER_MARKDOWN)
        .add_filter("Plain Text (*.txt)", &["txt"])
        .add_filter("All Files (*.*)", FILTER_ALL);

    builder.save_file(move |file_path| {
        let _ = tx.send(file_path);
    });

    let selected = rx.await.map_err(|e| e.to_string())?;

    if let Some(path) = selected {
        let mut path_str = path.to_string();
        let path_obj = std::path::Path::new(&path_str);
        if path_obj.extension().is_none() && !path_str.ends_with('/') && !path_str.ends_with('\\') {
            path_str.push_str(".txt");
        }
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_initial_file(state: State<'_, AppState>) -> Result<Option<FilePayload>, String> {
    let path_opt = {
        let guard = state.current_file_path.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };

    if let Some(path_buf) = path_opt {
        let path_str = path_buf.to_string_lossy().to_string();
        read_text_file(path_str).await.map(Some)
    } else if let Some(android_uri) = crate::commands::android_fs::get_android_initial_uri() {
        read_text_file(android_uri).await.map(Some)
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
        };

        // If multiple files were passed in a single CLI invocation, spawn companion instances (desktop only)
        #[cfg(desktop)]
        if file_args.len() > 1 {
            if let Ok(exe) = std::env::current_exe() {
                for extra in &file_args[1..] {
                    let _ = std::process::Command::new(&exe).arg(extra).spawn();
                }
            }
        }
    }
}

#[tauri::command]
pub async fn read_clipboard_image() -> Result<Option<ClipboardImagePayload>, String> {
    #[cfg(target_os = "android")]
    {
        if let Some((mime_type, bytes)) = crate::commands::android_fs::read_android_clipboard_image()? {
            return Ok(Some(ClipboardImagePayload { mime_type, bytes }));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn get_pending_commit_image() -> Result<Option<ClipboardImagePayload>, String> {
    #[cfg(target_os = "android")]
    {
        if let Some((mime_type, bytes)) = crate::commands::android_fs::read_android_pending_commit_image()? {
            return Ok(Some(ClipboardImagePayload { mime_type, bytes }));
        }
    }
    Ok(None)
}
