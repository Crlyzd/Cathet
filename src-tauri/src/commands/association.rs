use serde::Serialize;
#[cfg(any(target_os = "windows", target_os = "linux"))]
use std::env;
#[cfg(target_os = "windows")]
use std::ffi::OsStr;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use std::path::Path;
#[cfg(any(target_os = "windows", target_os = "linux"))]
use std::path::PathBuf;

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::ERROR_SUCCESS;
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyW, RegDeleteTreeW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW,
    HKEY, HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE, REG_SZ,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AssociationStatus {
    pub is_registered: bool,
    pub current_exe_path: String,
    pub registered_exe_path: Option<String>,
}

#[cfg(target_os = "windows")]
fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
fn reg_set_string(hkey: HKEY, subkey: &str, value_name: &str, value: &str) -> bool {
    unsafe {
        let subkey_w = to_wide(subkey);
        let mut key: HKEY = std::mem::zeroed();
        if RegCreateKeyW(hkey, subkey_w.as_ptr(), &mut key) != ERROR_SUCCESS {
            return false;
        }
        let val_w = to_wide(value);
        let val_name_w = to_wide(value_name);
        let set_res = RegSetValueExW(
            key,
            if value_name.is_empty() { std::ptr::null() } else { val_name_w.as_ptr() },
            0, REG_SZ, val_w.as_ptr() as *const u8, (val_w.len() * 2) as u32,
        );
        RegCloseKey(key);
        set_res == ERROR_SUCCESS
    }
}

#[cfg(target_os = "windows")]
fn reg_get_string(hkey: HKEY, subkey: &str, value_name: &str) -> Option<String> {
    unsafe {
        let subkey_w = to_wide(subkey);
        let mut key: HKEY = std::mem::zeroed();
        if RegOpenKeyExW(hkey, subkey_w.as_ptr(), 0, KEY_READ, &mut key) != ERROR_SUCCESS {
            return None;
        }
        let val_name_w = to_wide(value_name);
        let mut data_len: u32 = 0;
        let p_name = if value_name.is_empty() { std::ptr::null() } else { val_name_w.as_ptr() };
        if RegQueryValueExW(key, p_name, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut(), &mut data_len) != ERROR_SUCCESS || data_len == 0 {
            RegCloseKey(key);
            return None;
        }
        let mut buf = vec![0u16; (data_len as usize / 2) + 1];
        let status = RegQueryValueExW(key, p_name, std::ptr::null_mut(), std::ptr::null_mut(), buf.as_mut_ptr() as *mut u8, &mut data_len);
        RegCloseKey(key);
        if status == ERROR_SUCCESS {
            let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
            String::from_utf16(&buf[..len]).ok()
        } else {
            None
        }
    }
}

#[cfg(target_os = "windows")]
fn reg_delete_tree(hkey: HKEY, subkey: &str) -> bool {
    unsafe { RegDeleteTreeW(hkey, to_wide(subkey).as_ptr()) == ERROR_SUCCESS }
}

#[cfg(target_os = "windows")]
const SUPPORTED_EXTENSIONS: &[&str] = &[
    ".txt", ".md", ".markdown", ".log", ".json", ".yaml", ".yml", ".toml", ".xml",
    ".ini", ".cfg", ".csv", ".tsv", ".js", ".ts", ".rs", ".py", ".html", ".css",
];

#[cfg(target_os = "windows")]
pub fn register_associations(exe_path: &Path) -> Result<(), String> {
    let exe_str = exe_path.to_str().ok_or("Invalid executable path")?;
    let open_cmd = format!("\"{}\" \"%1\"", exe_str);
    let icon_cmd = format!("\"{}\",0", exe_str);

    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document", "", "Cathet Document");
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document\\DefaultIcon", "", &icon_cmd);
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document\\shell\\open\\command", "", &open_cmd);
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe", "FriendlyAppName", "Cathet");
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe\\DefaultIcon", "", &icon_cmd);
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe\\shell\\open\\command", "", &open_cmd);

    for ext in SUPPORTED_EXTENSIONS {
        reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe\\SupportedTypes", ext, "");
        reg_set_string(HKEY_CURRENT_USER, &format!("Software\\Classes\\{}\\OpenWithProgids", ext), "Cathet.Document", "");
        reg_set_string(HKEY_CURRENT_USER, "Software\\Cathet\\Capabilities\\FileAssociations", ext, "Cathet.Document");
    }

    reg_set_string(HKEY_CURRENT_USER, "Software\\Cathet\\Capabilities", "ApplicationName", "Cathet");
    reg_set_string(HKEY_CURRENT_USER, "Software\\Cathet\\Capabilities", "ApplicationDescription", "Lightweight frosted glass text & markdown editor for Windows");
    reg_set_string(HKEY_CURRENT_USER, "Software\\RegisteredApplications", "Cathet", "Software\\Cathet\\Capabilities");

    unsafe { SHChangeNotify(SHCNE_ASSOCCHANGED as i32, SHCNF_IDLIST, std::ptr::null(), std::ptr::null()); }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn unregister_associations() -> Result<(), String> {
    reg_delete_tree(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document");
    reg_delete_tree(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe");
    reg_delete_tree(HKEY_CURRENT_USER, "Software\\Cathet");

    unsafe {
        let key_w = to_wide("Software\\RegisteredApplications");
        let val_w = to_wide("Cathet");
        let mut key: HKEY = std::mem::zeroed();
        if RegOpenKeyExW(HKEY_CURRENT_USER, key_w.as_ptr(), 0, KEY_SET_VALUE, &mut key) == ERROR_SUCCESS {
            windows_sys::Win32::System::Registry::RegDeleteValueW(key, val_w.as_ptr());
            RegCloseKey(key);
        }
        SHChangeNotify(SHCNE_ASSOCCHANGED as i32, SHCNF_IDLIST, std::ptr::null(), std::ptr::null());
    }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn read_registered_exe() -> Option<String> {
    let cmd = reg_get_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document\\shell\\open\\command", "")?;
    let trimmed = cmd.trim();
    if trimmed.starts_with('"') {
        trimmed.split('"').nth(1).map(|s| s.to_string())
    } else {
        trimmed.split_whitespace().next().map(|s| s.to_string())
    }
}

#[cfg(target_os = "windows")]
pub fn self_heal_if_moved() -> bool {
    let Ok(current_exe) = env::current_exe() else { return false };
    if let Some(registered) = read_registered_exe() {
        if PathBuf::from(&registered) != current_exe {
            let _ = register_associations(&current_exe);
            return true;
        }
    }
    false
}

#[cfg(not(target_os = "windows"))]
pub fn self_heal_if_moved() -> bool { false }

#[cfg(target_os = "linux")]
fn linux_desktop_entry_path() -> Option<PathBuf> {
    env::var("HOME").ok().map(|h| PathBuf::from(h).join(".local/share/applications/com.cathet.app.desktop"))
}

#[cfg(target_os = "linux")]
fn resolve_linux_exec_path() -> String {
    env::var("APPIMAGE").ok().filter(|s| !s.is_empty()).unwrap_or_else(|| {
        env::current_exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
    })
}

#[tauri::command]
pub async fn get_association_status() -> Result<AssociationStatus, String> {
    #[cfg(target_os = "windows")]
    {
        let current_exe = env::current_exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
        let registered_exe = read_registered_exe();
        return Ok(AssociationStatus {
            is_registered: registered_exe.is_some(),
            current_exe_path: current_exe,
            registered_exe_path: registered_exe,
        });
    }
    #[cfg(target_os = "linux")]
    {
        let current_exe = resolve_linux_exec_path();
        let out = std::process::Command::new("xdg-mime")
            .args(["query", "default", "text/markdown"])
            .output()
            .ok();
        let is_reg = out
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("com.cathet.app.desktop"))
            .unwrap_or(false);
        return Ok(AssociationStatus {
            is_registered: is_reg,
            current_exe_path: current_exe.clone(),
            registered_exe_path: if is_reg { Some(current_exe) } else { None },
        });
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Ok(AssociationStatus {
            is_registered: false,
            current_exe_path: String::new(),
            registered_exe_path: None,
        })
    }
}

#[tauri::command]
pub async fn configure_default_app() -> Result<AssociationStatus, String> {
    #[cfg(target_os = "windows")]
    {
        let current_exe = env::current_exe().map_err(|e| e.to_string())?;
        register_associations(&current_exe)?;
        let _ = tauri_plugin_opener::open_url("ms-settings:defaultapps", None::<&str>);
        return get_association_status().await;
    }
    #[cfg(target_os = "linux")]
    {
        let exec_path = resolve_linux_exec_path();
        if let Some(desktop_path) = linux_desktop_entry_path() {
            if let Some(parent) = desktop_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let entry = format!(
                "[Desktop Entry]\nName=Cathet\nComment=Lightweight text & markdown editor\nExec=\"{}\" %F\nIcon=cathet\nTerminal=false\nType=Application\nCategories=Utility;TextEditor;Development;\nMimeType=text/plain;text/markdown;text/x-markdown;\n",
                exec_path
            );
            let _ = std::fs::write(&desktop_path, entry);
        }
        let _ = std::process::Command::new("xdg-mime")
            .args(["default", "com.cathet.app.desktop", "text/plain", "text/markdown", "text/x-markdown"])
            .status();
        return get_association_status().await;
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        get_association_status().await
    }
}

#[tauri::command]
pub async fn unregister_default_app() -> Result<AssociationStatus, String> {
    #[cfg(target_os = "windows")]
    {
        unregister_associations()?;
        return get_association_status().await;
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(desktop_path) = linux_desktop_entry_path() {
            let _ = std::fs::remove_file(desktop_path);
        }
        return get_association_status().await;
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        get_association_status().await
    }
}
