use std::{fs, path::Path};
use tauri::AppHandle;
use super::notes::{
    current_timestamp, get_notes_root, is_reserved_folder, load_registry, sanitize_filename,
    save_registry,
};

#[tauri::command]
pub async fn create_folder(app_handle: AppHandle, folder_name: String) -> Result<(), String> {
    let raw = folder_name.trim();
    if is_reserved_folder(raw) { return Ok(()); }
    let clean = sanitize_filename(raw);
    if is_reserved_folder(&clean) { return Ok(()); }
    let root = get_notes_root(&app_handle)?;
    fs::create_dir_all(root.join(&clean)).map_err(|e| e.to_string())?;
    let mut reg = load_registry(&root);
    if !reg.folders.contains(&clean) {
        reg.folders.push(clean);
        save_registry(&root, &reg)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn rename_folder(app_handle: AppHandle, old_name: String, new_name: String) -> Result<String, String> {
    let old_c = old_name.trim().to_string();
    let new_raw = new_name.trim();
    if is_reserved_folder(&old_c) || is_reserved_folder(new_raw) { return Ok(old_c); }
    let new_c = sanitize_filename(new_raw);
    if is_reserved_folder(&new_c) || old_c == new_c { return Ok(old_c); }
    let root = get_notes_root(&app_handle)?;
    let (old_dir, new_dir) = (root.join(&old_c), root.join(&new_c));
    if new_dir.exists() { return Err("Folder already exists".to_string()); }
    if old_dir.exists() { fs::rename(&old_dir, &new_dir).map_err(|e| e.to_string())?; }
    else { fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?; }

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
    if let Some(pos) = reg.folders.iter().position(|f| f == &old_c) {
        if reg.folders.contains(&new_c) { reg.folders.remove(pos); } else { reg.folders[pos] = new_c.clone(); }
    } else if !reg.folders.contains(&new_c) {
        reg.folders.push(new_c.clone());
    }
    save_registry(&root, &reg)?;
    Ok(new_c)
}

#[tauri::command]
pub async fn delete_folder(app_handle: AppHandle, folder_name: String, delete_notes: bool) -> Result<(), String> {
    let clean = folder_name.trim().to_string();
    if is_reserved_folder(&clean) { return Ok(()); }
    let root = get_notes_root(&app_handle)?;
    let (folder_dir, mut reg) = (root.join(&clean), load_registry(&root));
    let note_ids: Vec<String> = reg.notes.iter().filter(|(_, r)| r.folder == clean).map(|(id, _)| id.clone()).collect();
    for id in note_ids {
        let is_priv = reg.notes.get(&id).map(|r| r.is_hidden).unwrap_or(false);
        if delete_notes && !is_priv {
            let _ = fs::remove_file(root.join(&id)); reg.notes.remove(&id);
        } else if let Some(mut record) = reg.notes.remove(&id) {
            let src_path = root.join(&id);
            if let Some(fname) = src_path.file_name() {
                let mut dest = root.join(fname);
                if dest.exists() {
                    dest = root.join(format!("{}_{}.md", src_path.file_stem().and_then(|s| s.to_str()).unwrap_or("Note"), current_timestamp() % 10000));
                }
                let final_p = if fs::rename(&src_path, &dest).is_ok() { dest } else { src_path };
                let new_id = final_p.strip_prefix(&root).unwrap_or(&final_p).to_string_lossy().replace('\\', "/");
                record.id = new_id.clone(); record.folder = String::new(); reg.notes.insert(new_id, record);
            }
        }
    }
    if folder_dir.exists() { let _ = fs::remove_dir_all(&folder_dir); }
    reg.folders.retain(|f| f != &clean);
    save_registry(&root, &reg)
}

#[tauri::command]
pub async fn reorder_folders(app_handle: AppHandle, order: Vec<String>) -> Result<Vec<String>, String> {
    let root = get_notes_root(&app_handle)?;
    let mut reg = load_registry(&root);
    let valid: Vec<String> = reg.folders.iter().filter(|f| !is_reserved_folder(f) && root.join(f).is_dir()).cloned().collect();
    let mut next_order = Vec::with_capacity(valid.len());
    for item in order {
        if valid.contains(&item) && !next_order.contains(&item) { next_order.push(item); }
    }
    for item in valid {
        if !next_order.contains(&item) { next_order.push(item); }
    }
    reg.folders = next_order.clone();
    save_registry(&root, &reg)?;
    Ok(next_order)
}
