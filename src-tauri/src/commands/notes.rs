use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NoteMetadataRecord {
    pub id: String,
    pub title: String,
    pub folder: String,
    pub snippet: String,
    #[serde(rename = "isPinned")]
    pub is_pinned: bool,
    #[serde(rename = "isHidden")]
    pub is_hidden: bool,
    #[serde(rename = "updatedAt")]
    pub updated_at: u64,
    #[serde(rename = "fileSize")]
    pub file_size: u64,
}

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
pub struct NotesRegistry {
    pub folders: Vec<String>,
    pub notes: HashMap<String, NoteMetadataRecord>,
}

fn get_notes_root(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let notes_dir = data_dir.join("notes");
    if !notes_dir.exists() { fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?; }
    Ok(notes_dir)
}

fn load_registry(root: &Path) -> NotesRegistry {
    fs::read_to_string(root.join("metadata.json")).ok().and_then(|c| serde_json::from_str(&c).ok()).unwrap_or_default()
}

fn save_registry(root: &Path, reg: &NotesRegistry) -> Result<(), String> {
    let content = serde_json::to_string_pretty(reg).map_err(|e| e.to_string())?;
    fs::write(root.join("metadata.json"), content).map_err(|e| e.to_string())
}

fn extract_title_and_snippet(content: &str, fallback_name: &str) -> (String, String) {
    let lines: Vec<&str> = content.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    if lines.is_empty() { return (fallback_name.to_string(), String::new()); }
    let raw_title = lines[0].trim_start_matches('#').trim();
    let title = if raw_title.starts_with("file:///") || raw_title.contains('/') || raw_title.contains('\\') {
        let clean_path = raw_title.trim_start_matches("file:///");
        clean_path.split(['/', '\\']).filter(|s| !s.is_empty()).last().unwrap_or(fallback_name).to_string()
    } else if raw_title.is_empty() {
        fallback_name.to_string()
    } else {
        raw_title.to_string()
    };
    let body = if lines.len() > 1 { lines[1..].join(" ") } else { String::new() };
    let snippet = if body.chars().count() > 120 { body.chars().take(120).collect::<String>() + "..." } else { body };
    (title, snippet)
}

fn current_timestamp() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

fn sanitize_filename(name: &str) -> String {
    let clean: String = name.chars().map(|c| if "<>:\"/\\|?*".contains(c) { '_' } else { c }).collect();
    let t = clean.trim();
    if t.is_empty() { "Untitled Note".to_string() } else { t.to_string() }
}

#[tauri::command]
pub async fn list_notes(app_handle: AppHandle) -> Result<NotesRegistry, String> {
    let root = get_notes_root(&app_handle)?;
    let mut reg = load_registry(&root);
    let mut folders = Vec::new();
    let mut scanned_ids = HashMap::new();

    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(folder_name) = path.file_name().and_then(|n| n.to_str()) {
                    folders.push(folder_name.to_string());
                    if let Ok(sub_entries) = fs::read_dir(&path) {
                        for sub_entry in sub_entries.flatten() {
                            scan_file(&sub_entry.path(), &root, folder_name, &mut reg, &mut scanned_ids);
                        }
                    }
                }
            } else if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("md") {
                scan_file(&path, &root, "", &mut reg, &mut scanned_ids);
            }
        }
    }

    folders.sort();
    reg.folders = folders;
    reg.notes.retain(|id, _| scanned_ids.contains_key(id));
    let _ = save_registry(&root, &reg);
    Ok(reg)
}

fn scan_file(path: &Path, root: &Path, folder: &str, reg: &mut NotesRegistry, scanned: &mut HashMap<String, bool>) {
    let rel_path = path.strip_prefix(root).unwrap_or(path).to_string_lossy().replace('\\', "/");
    scanned.insert(rel_path.clone(), true);
    if let std::collections::hash_map::Entry::Vacant(e) = reg.notes.entry(rel_path.clone()) {
        let content = fs::read_to_string(path).unwrap_or_default();
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled Note");
        let (title, snippet) = extract_title_and_snippet(&content, stem);
        let meta = fs::metadata(path).ok();
        e.insert(NoteMetadataRecord {
            id: rel_path, title, folder: folder.to_string(), snippet, is_pinned: false, is_hidden: false,
            updated_at: current_timestamp(), file_size: meta.map(|m| m.len()).unwrap_or(0),
        });
    }
}

#[tauri::command]
pub async fn save_note(
    app_handle: AppHandle,
    id: Option<String>,
    content: String,
    folder: Option<String>,
) -> Result<NoteMetadataRecord, String> {
    let root = get_notes_root(&app_handle)?;
    let mut reg = load_registry(&root);
    let target_folder = folder.unwrap_or_default();

    let (rel_path, abs_path, title, snippet) = if let Some(existing_id) = id.filter(|s| !s.is_empty()) {
        let abs = root.join(&existing_id);
        let stem = abs.file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled Note");
        let (t, s) = extract_title_and_snippet(&content, stem);
        (existing_id, abs, t, s)
    } else {
        let (t, s) = extract_title_and_snippet(&content, "Untitled Note");
        let base_name = sanitize_filename(&t);
        let file_name = format!("{}.md", base_name);
        let (rel, abs) = if target_folder.is_empty() || target_folder == "All" {
            (file_name.clone(), root.join(&file_name))
        } else {
            let f_dir = root.join(&target_folder);
            let _ = fs::create_dir_all(&f_dir);
            (format!("{}/{}", target_folder, file_name), f_dir.join(&file_name))
        };
        (rel, abs, t, s)
    };

    fs::write(&abs_path, &content).map_err(|e| e.to_string())?;
    let size = fs::metadata(&abs_path).map(|m| m.len()).unwrap_or(content.len() as u64);
    let (is_pinned, is_hidden) = reg.notes.get(&rel_path).map(|r| (r.is_pinned, r.is_hidden)).unwrap_or((false, false));

    let record = NoteMetadataRecord {
        id: rel_path.clone(), title, folder: target_folder, snippet, is_pinned, is_hidden,
        updated_at: current_timestamp(), file_size: size,
    };
    reg.notes.insert(rel_path, record.clone());
    save_registry(&root, &reg)?;
    Ok(record)
}

#[tauri::command]
pub async fn delete_notes(app_handle: AppHandle, ids: Vec<String>) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?;
    let mut reg = load_registry(&root);
    for id in &ids {
        let _ = fs::remove_file(root.join(id));
        reg.notes.remove(id);
    }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn move_notes(app_handle: AppHandle, ids: Vec<String>, target_folder: String) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?;
    let mut reg = load_registry(&root);
    let dest_dir = if target_folder.is_empty() || target_folder == "All" {
        root.clone()
    } else {
        let d = root.join(&target_folder);
        let _ = fs::create_dir_all(&d);
        d
    };

    for id in ids {
        if let Some(mut record) = reg.notes.remove(&id) {
            let src_path = root.join(&id);
            if let Some(file_name) = src_path.file_name() {
                let dest_path = dest_dir.join(file_name);
                if fs::rename(&src_path, &dest_path).is_ok() {
                    let new_id = dest_path.strip_prefix(&root).unwrap_or(&dest_path).to_string_lossy().replace('\\', "/");
                    record.id = new_id.clone();
                    record.folder = if target_folder == "All" { String::new() } else { target_folder.clone() };
                    reg.notes.insert(new_id, record);
                }
            }
        }
    }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn set_note_pinned(app_handle: AppHandle, ids: Vec<String>, pinned: bool) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?;
    let mut reg = load_registry(&root);
    for id in ids { if let Some(rec) = reg.notes.get_mut(&id) { rec.is_pinned = pinned; } }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn set_note_hidden(app_handle: AppHandle, ids: Vec<String>, hidden: bool) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?;
    let mut reg = load_registry(&root);
    for id in ids { if let Some(rec) = reg.notes.get_mut(&id) { rec.is_hidden = hidden; } }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn create_folder(app_handle: AppHandle, folder_name: String) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?;
    let folder_dir = root.join(&folder_name);
    fs::create_dir_all(folder_dir).map_err(|e| e.to_string())?;
    let mut reg = load_registry(&root);
    if !reg.folders.contains(&folder_name) {
        reg.folders.push(folder_name);
        reg.folders.sort();
        save_registry(&root, &reg)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn read_note(app_handle: AppHandle, id: String) -> Result<crate::commands::file::FilePayload, String> {
    let root = get_notes_root(&app_handle)?;
    crate::commands::file::read_text_file(root.join(&id).to_string_lossy().to_string()).await
}

#[tauri::command]
pub async fn import_external_file(
    app_handle: AppHandle,
    source_path: String,
    folder: Option<String>,
) -> Result<NoteMetadataRecord, String> {
    let content = crate::commands::file::read_text_file(source_path).await?.content;
    save_note(app_handle, None, content, folder).await
}
