use std::{collections::HashMap, fs, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NoteMetadataRecord {
    pub id: String, pub title: String, pub folder: String, pub snippet: String,
    #[serde(rename = "isPinned")] pub is_pinned: bool, #[serde(rename = "isHidden")] pub is_hidden: bool,
    #[serde(rename = "updatedAt")] pub updated_at: u64, #[serde(rename = "fileSize")] pub file_size: u64,
}

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
pub struct NotesRegistry { pub folders: Vec<String>, pub notes: HashMap<String, NoteMetadataRecord> }

fn get_notes_root(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let d = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join("notes");
    if !d.exists() { fs::create_dir_all(&d).map_err(|e| e.to_string())?; }
    Ok(d)
}

fn load_registry(root: &Path) -> NotesRegistry {
    fs::read_to_string(root.join("metadata.json")).ok().and_then(|c| serde_json::from_str(&c).ok()).unwrap_or_default()
}

fn save_registry(root: &Path, reg: &NotesRegistry) -> Result<(), String> {
    fs::write(root.join("metadata.json"), serde_json::to_string_pretty(reg).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

fn extract_title_and_snippet(content: &str, fallback_name: &str) -> (String, String) {
    let lines: Vec<&str> = content.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    if lines.is_empty() { return (fallback_name.to_string(), String::new()); }
    let raw_title = lines[0].trim_start_matches('#').trim();
    let title = if raw_title.starts_with("file:///") || raw_title.contains('/') || raw_title.contains('\\') {
        raw_title.trim_start_matches("file:///").split(['/', '\\']).filter(|s| !s.is_empty()).last().unwrap_or(fallback_name).to_string()
    } else if raw_title.is_empty() { fallback_name.to_string() } else { raw_title.to_string() };
    let body = if lines.len() > 1 { lines[1..].join(" ") } else { String::new() };
    let snippet = if body.chars().count() > 120 { body.chars().take(120).collect::<String>() + "..." } else { body };
    (title, snippet)
}

fn current_timestamp() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 }

fn sanitize_filename(name: &str) -> String {
    let clean: String = name.chars().map(|c| if "<>:\"/\\|?*".contains(c) { '_' } else { c }).collect();
    let t = clean.trim(); if t.is_empty() { "Untitled Note".to_string() } else { t.to_string() }
}

fn is_reserved_folder(name: &str) -> bool {
    let t = name.trim(); t.is_empty() || t.eq_ignore_ascii_case("All") || t.eq_ignore_ascii_case("Hidden")
}

#[tauri::command]
pub async fn list_notes(app_handle: AppHandle) -> Result<NotesRegistry, String> {
    let root = get_notes_root(&app_handle)?;
    let (mut reg, mut folders, mut scanned_ids) = (load_registry(&root), Vec::new(), HashMap::new());
    for entry in fs::read_dir(&root).into_iter().flatten().flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(folder_name) = path.file_name().and_then(|n| n.to_str()) {
                if folder_name.eq_ignore_ascii_case("Hidden") {
                    for sub in fs::read_dir(&path).into_iter().flatten().flatten() {
                        let sp = sub.path();
                        if let Some(f) = sp.file_name() {
                            let dest = root.join(f);
                            let tp = if !dest.exists() && fs::rename(&sp, &dest).is_ok() { dest } else { sp };
                            scan_file(&tp, &root, "", true, &mut reg, &mut scanned_ids);
                        }
                    }
                    let _ = fs::remove_dir(&path);
                } else if !is_reserved_folder(folder_name) {
                    folders.push(folder_name.to_string());
                    for sub in fs::read_dir(&path).into_iter().flatten().flatten() { scan_file(&sub.path(), &root, folder_name, false, &mut reg, &mut scanned_ids); }
                }
            }
        } else if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("md") {
            scan_file(&path, &root, "", false, &mut reg, &mut scanned_ids);
        }
    }
    folders.sort(); reg.folders = folders; reg.notes.retain(|id, _| scanned_ids.contains_key(id));
    let _ = save_registry(&root, &reg); Ok(reg)
}

fn scan_file(path: &Path, root: &Path, folder: &str, force_hidden: bool, reg: &mut NotesRegistry, scanned: &mut HashMap<String, bool>) {
    let rel_path = path.strip_prefix(root).unwrap_or(path).to_string_lossy().replace('\\', "/");
    scanned.insert(rel_path.clone(), true);
    if let Some(existing) = reg.notes.get_mut(&rel_path) {
        if force_hidden { existing.is_hidden = true; existing.folder = String::new(); }
        return;
    }
    let (content, stem) = (fs::read_to_string(path).unwrap_or_default(), path.file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled Note"));
    let ((title, snippet), file_size) = (extract_title_and_snippet(&content, stem), fs::metadata(path).map(|m| m.len()).unwrap_or(0));
    reg.notes.insert(rel_path.clone(), NoteMetadataRecord { id: rel_path, title, folder: folder.to_string(), snippet, is_pinned: false, is_hidden: force_hidden, updated_at: current_timestamp(), file_size });
}

#[tauri::command]
pub async fn save_note(app_handle: AppHandle, id: Option<String>, content: String, folder: Option<String>, title: Option<String>) -> Result<NoteMetadataRecord, String> {
    let root = get_notes_root(&app_handle)?; let mut reg = load_registry(&root);
    let raw_folder = folder.unwrap_or_default();
    let is_private_folder = raw_folder.trim().eq_ignore_ascii_case("Hidden");
    let target_folder = if is_reserved_folder(&raw_folder) { String::new() } else { raw_folder };
    let custom_title = title.map(|t| t.trim().to_string()).filter(|t| !t.is_empty());
    let (rel_path, abs_path, final_title, snippet) = if let Some(existing_id) = id.filter(|s| !s.is_empty()) {
        let abs = root.join(&existing_id);
        let stem = abs.file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled Note");
        let (extracted_t, s) = extract_title_and_snippet(&content, stem);
        let kept_t = custom_title.or_else(|| reg.notes.get(&existing_id).map(|r| r.title.clone()).filter(|t| !t.is_empty() && t != "Untitled Note")).unwrap_or(extracted_t);
        (existing_id, abs, kept_t, s)
    } else {
        let (extracted_t, s) = extract_title_and_snippet(&content, "Untitled Note");
        let t = custom_title.unwrap_or(extracted_t);
        let file_name = format!("{}.md", sanitize_filename(&t));
        let (rel, abs) = if target_folder.is_empty() { (file_name.clone(), root.join(&file_name)) } else {
            let f_dir = root.join(&target_folder); let _ = fs::create_dir_all(&f_dir);
            (format!("{}/{}", target_folder, file_name), f_dir.join(&file_name))
        };
        (rel, abs, t, s)
    };
    fs::write(&abs_path, &content).map_err(|e| e.to_string())?;
    let size = fs::metadata(&abs_path).map(|m| m.len()).unwrap_or(content.len() as u64);
    let (is_pinned, is_hidden) = reg.notes.get(&rel_path).map(|r| (r.is_pinned, r.is_hidden || is_private_folder)).unwrap_or((false, is_private_folder));
    let record = NoteMetadataRecord { id: rel_path.clone(), title: final_title, folder: target_folder, snippet, is_pinned, is_hidden, updated_at: current_timestamp(), file_size: size };
    reg.notes.insert(rel_path, record.clone()); save_registry(&root, &reg)?; Ok(record)
}

#[tauri::command]
pub async fn rename_note(app_handle: AppHandle, id: String, new_title: String) -> Result<NoteMetadataRecord, String> {
    let clean_title = new_title.trim().to_string();
    if clean_title.is_empty() { return Err("Title cannot be empty".to_string()); }
    let root = get_notes_root(&app_handle)?; let mut reg = load_registry(&root);
    let mut record = reg.notes.remove(&id).ok_or_else(|| "Note not found".to_string())?;
    let (src_path, file_name) = (root.join(&id), format!("{}.md", sanitize_filename(&clean_title)));
    let dest_path = if is_reserved_folder(&record.folder) { root.join(&file_name) } else { root.join(&record.folder).join(&file_name) };
    let final_path = if src_path != dest_path && !dest_path.exists() && fs::rename(&src_path, &dest_path).is_ok() { dest_path } else { src_path };
    let new_id = final_path.strip_prefix(&root).unwrap_or(&final_path).to_string_lossy().replace('\\', "/");
    record.id = new_id.clone(); record.title = clean_title; record.updated_at = current_timestamp();
    reg.notes.insert(new_id, record.clone()); save_registry(&root, &reg)?; Ok(record)
}

#[tauri::command]
pub async fn delete_notes(app_handle: AppHandle, ids: Vec<String>) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?; let mut reg = load_registry(&root);
    for id in &ids { let _ = fs::remove_file(root.join(id)); reg.notes.remove(id); }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn move_notes(app_handle: AppHandle, ids: Vec<String>, target_folder: String) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?; let mut reg = load_registry(&root);
    let dest_dir = if is_reserved_folder(&target_folder) { root.clone() } else { let d = root.join(&target_folder); let _ = fs::create_dir_all(&d); d };
    for id in ids {
        if let Some(mut record) = reg.notes.remove(&id) {
            let src_path = root.join(&id);
            if let Some(file_name) = src_path.file_name() {
                let dest_path = dest_dir.join(file_name);
                if fs::rename(&src_path, &dest_path).is_ok() {
                    let new_id = dest_path.strip_prefix(&root).unwrap_or(&dest_path).to_string_lossy().replace('\\', "/");
                    record.id = new_id.clone(); record.folder = if is_reserved_folder(&target_folder) { String::new() } else { target_folder.clone() };
                    reg.notes.insert(new_id, record);
                }
            }
        }
    }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn set_note_pinned(app_handle: AppHandle, ids: Vec<String>, pinned: bool) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?; let mut reg = load_registry(&root);
    for id in ids { if let Some(rec) = reg.notes.get_mut(&id) { rec.is_pinned = pinned; } }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn set_note_hidden(app_handle: AppHandle, ids: Vec<String>, hidden: bool) -> Result<(), String> {
    let root = get_notes_root(&app_handle)?; let mut reg = load_registry(&root);
    for id in ids { if let Some(rec) = reg.notes.get_mut(&id) { rec.is_hidden = hidden; } }
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn create_folder(app_handle: AppHandle, folder_name: String) -> Result<(), String> {
    let clean = folder_name.trim().to_string();
    if is_reserved_folder(&clean) { return Ok(()); }
    let root = get_notes_root(&app_handle)?;
    fs::create_dir_all(root.join(&clean)).map_err(|e| e.to_string())?;
    let mut reg = load_registry(&root);
    if !reg.folders.contains(&clean) { reg.folders.push(clean); reg.folders.sort(); save_registry(&root, &reg)?; }
    Ok(())
}

#[tauri::command]
pub async fn rename_folder(app_handle: AppHandle, old_name: String, new_name: String) -> Result<String, String> {
    let (old_c, new_c) = (old_name.trim().to_string(), sanitize_filename(new_name.trim()));
    if is_reserved_folder(&old_c) || is_reserved_folder(&new_c) || old_c == new_c { return Ok(old_c); }
    let root = get_notes_root(&app_handle)?;
    let (old_dir, new_dir) = (root.join(&old_c), root.join(&new_c));
    if new_dir.exists() { return Err("Folder already exists".to_string()); }
    if old_dir.exists() { fs::rename(&old_dir, &new_dir).map_err(|e| e.to_string())?; } else { fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?; }
    let mut reg = load_registry(&root);
    let note_ids: Vec<String> = reg.notes.iter().filter(|(_, r)| r.folder == old_c).map(|(id, _)| id.clone()).collect();
    for id in note_ids {
        if let Some(mut rec) = reg.notes.remove(&id) {
            let fname = Path::new(&id).file_name().and_then(|n| n.to_str()).unwrap_or("Untitled Note.md");
            let new_id = format!("{}/{}", new_c, fname);
            rec.id = new_id.clone(); rec.folder = new_c.clone(); rec.updated_at = current_timestamp();
            reg.notes.insert(new_id, rec);
        }
    }
    reg.folders.retain(|f| f != &old_c);
    if !reg.folders.contains(&new_c) { reg.folders.push(new_c.clone()); reg.folders.sort(); }
    save_registry(&root, &reg)?; Ok(new_c)
}

#[tauri::command]
pub async fn delete_folder(app_handle: AppHandle, folder_name: String, delete_notes: bool) -> Result<(), String> {
    let clean = folder_name.trim().to_string();
    if is_reserved_folder(&clean) { return Ok(()); }
    let root = get_notes_root(&app_handle)?; let folder_dir = root.join(&clean); let mut reg = load_registry(&root);
    let note_ids: Vec<String> = reg.notes.iter().filter(|(_, r)| r.folder == clean).map(|(id, _)| id.clone()).collect();
    for id in note_ids {
        let is_priv = reg.notes.get(&id).map(|r| r.is_hidden).unwrap_or(false);
        if delete_notes && !is_priv {
            let _ = fs::remove_file(root.join(&id)); reg.notes.remove(&id);
        } else if let Some(mut record) = reg.notes.remove(&id) {
            let src_path = root.join(&id);
            if let Some(fname) = src_path.file_name() {
                let mut dest = root.join(fname);
                if dest.exists() { dest = root.join(format!("{}_{}.md", src_path.file_stem().and_then(|s| s.to_str()).unwrap_or("Note"), current_timestamp() % 10000)); }
                let final_p = if fs::rename(&src_path, &dest).is_ok() { dest } else { src_path };
                let new_id = final_p.strip_prefix(&root).unwrap_or(&final_p).to_string_lossy().replace('\\', "/");
                record.id = new_id.clone(); record.folder = String::new(); reg.notes.insert(new_id, record);
            }
        }
    }
    if folder_dir.exists() { let _ = fs::remove_dir_all(&folder_dir); }
    reg.folders.retain(|f| f != &clean); save_registry(&root, &reg)
}

#[tauri::command]
pub async fn read_note(app_handle: AppHandle, id: String) -> Result<crate::commands::file::FilePayload, String> {
    crate::commands::file::read_text_file(get_notes_root(&app_handle)?.join(&id).to_string_lossy().to_string()).await
}

#[tauri::command]
pub async fn import_external_file(app_handle: AppHandle, source_path: String, folder: Option<String>) -> Result<NoteMetadataRecord, String> {
    let res = crate::commands::file::read_text_file(source_path).await?;
    let stem = res.display_name.as_deref().and_then(|n| n.rsplit_once('.').map(|(s, _)| s).or(Some(n))).map(|s| s.to_string());
    save_note(app_handle, None, res.content, folder, stem).await
}
