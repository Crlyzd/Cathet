use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
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
