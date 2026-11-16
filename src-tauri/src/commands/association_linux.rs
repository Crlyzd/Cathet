//! Linux XDG desktop entry & MIME icon association helpers.

#[cfg(target_os = "linux")]
use std::env;
#[cfg(target_os = "linux")]
use std::path::{Path, PathBuf};
#[cfg(target_os = "linux")]
use std::process::Command;

#[cfg(target_os = "linux")]
const DOC_ICON_SVG: &[u8] = include_bytes!("../../icons/doc-icon.svg");

#[cfg(target_os = "linux")]
const MIME_XML: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="text/markdown">
    <icon name="cathet-document"/>
  </mime-type>
  <mime-type type="text/x-markdown">
    <icon name="cathet-document"/>
  </mime-type>
  <mime-type type="text/plain">
    <icon name="cathet-document"/>
  </mime-type>
</mime-info>
"#;

#[cfg(target_os = "linux")]
fn xdg_data_home() -> Option<PathBuf> {
    if let Ok(xdg) = env::var("XDG_DATA_HOME") {
        let trimmed = xdg.trim();
        if !trimmed.is_empty() {
            return Some(PathBuf::from(trimmed));
        }
    }
    env::var("HOME").ok().map(|h| PathBuf::from(h).join(".local/share"))
}

#[cfg(target_os = "linux")]
fn desktop_entry_path() -> Option<PathBuf> {
    xdg_data_home().map(|d| d.join("applications/com.cathet.app.desktop"))
}

#[cfg(target_os = "linux")]
pub fn resolve_exec_path() -> String {
    env::var("APPIMAGE").ok().filter(|s| !s.is_empty()).unwrap_or_else(|| {
        env::current_exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
    })
}

#[cfg(target_os = "linux")]
pub fn is_registered() -> bool {
    Command::new("xdg-mime")
        .args(["query", "default", "text/markdown"])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("com.cathet.app.desktop"))
        .unwrap_or(false)
}

#[cfg(target_os = "linux")]
fn refresh_mime_and_icon_caches(data_home: &Path) {
    let mime_dir = data_home.join("mime");
    let _ = Command::new("update-mime-database").arg(&mime_dir).status();

    let hicolor_dir = data_home.join("icons/hicolor");
    if Command::new("gtk-update-icon-cache")
        .args(["-f", "-t"])
        .arg(&hicolor_dir)
        .status()
        .is_err()
    {
        let _ = Command::new("gtk4-update-icon-cache")
            .args(["-f", "-t"])
            .arg(&hicolor_dir)
            .status();
    }
}

#[cfg(target_os = "linux")]
pub fn configure_default() {
    let exec_path = resolve_exec_path();
    if let Some(desktop_path) = desktop_entry_path() {
        if let Some(parent) = desktop_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let entry = format!(
            "[Desktop Entry]\nName=Cathet\nComment=Lightweight text & markdown editor\nExec=\"{}\" %F\nIcon=cathet\nTerminal=false\nType=Application\nCategories=Utility;TextEditor;Development;\nMimeType=text/plain;text/markdown;text/x-markdown;\n",
            exec_path
        );
        let _ = std::fs::write(&desktop_path, entry);
    }

    if let Some(data_home) = xdg_data_home() {
        let icon_path = data_home.join("icons/hicolor/scalable/mimetypes/cathet-document.svg");
        if let Some(parent) = icon_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(&icon_path, DOC_ICON_SVG);

        let mime_pkg_path = data_home.join("mime/packages/cathet.xml");
        if let Some(parent) = mime_pkg_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(&mime_pkg_path, MIME_XML);

        refresh_mime_and_icon_caches(&data_home);
    }

    let _ = Command::new("xdg-mime")
        .args(["default", "com.cathet.app.desktop", "text/plain", "text/markdown", "text/x-markdown"])
        .status();
}

#[cfg(target_os = "linux")]
pub fn unregister_default() {
    if let Some(desktop_path) = desktop_entry_path() {
        let _ = std::fs::remove_file(desktop_path);
    }
    if let Some(data_home) = xdg_data_home() {
        let _ = std::fs::remove_file(data_home.join("icons/hicolor/scalable/mimetypes/cathet-document.svg"));
        let _ = std::fs::remove_file(data_home.join("mime/packages/cathet.xml"));
        refresh_mime_and_icon_caches(&data_home);
    }
}
