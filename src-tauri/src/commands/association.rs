use serde::Serialize;
use std::env;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use windows_sys::Win32::Foundation::ERROR_SUCCESS;
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyW, RegDeleteTreeW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW,
    HKEY, HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE, REG_SZ,
};
use windows_sys::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AssociationStatus {
    pub is_registered: bool,
    pub current_exe_path: String,
    pub registered_exe_path: Option<String>,
}

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

fn reg_set_string(hkey: HKEY, subkey: &str, value_name: &str, value: &str) -> bool {
    unsafe {
        let subkey_w = to_wide(subkey);
        let mut key: HKEY = std::mem::zeroed();
        let status = RegCreateKeyW(hkey, subkey_w.as_ptr(), &mut key);
        if status != ERROR_SUCCESS {
            return false;
        }

        let val_w = to_wide(value);
        let val_name_w = to_wide(value_name);
        let set_res = RegSetValueExW(
            key,
            if value_name.is_empty() { std::ptr::null() } else { val_name_w.as_ptr() },
            0,
            REG_SZ,
            val_w.as_ptr() as *const u8,
            (val_w.len() * 2) as u32,
        );

        RegCloseKey(key);
        set_res == ERROR_SUCCESS
    }
}

fn reg_get_string(hkey: HKEY, subkey: &str, value_name: &str) -> Option<String> {
    unsafe {
        let subkey_w = to_wide(subkey);
        let mut key: HKEY = std::mem::zeroed();
        let status = RegOpenKeyExW(hkey, subkey_w.as_ptr(), 0, KEY_READ, &mut key);
        if status != ERROR_SUCCESS {
            return None;
        }

        let val_name_w = to_wide(value_name);
        let mut data_len: u32 = 0;
        let query_len_status = RegQueryValueExW(
            key,
            if value_name.is_empty() { std::ptr::null() } else { val_name_w.as_ptr() },
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            &mut data_len,
        );

        if query_len_status != ERROR_SUCCESS || data_len == 0 {
            RegCloseKey(key);
            return None;
        }

        let mut buf = vec![0u16; (data_len as usize / 2) + 1];
        let query_status = RegQueryValueExW(
            key,
            if value_name.is_empty() { std::ptr::null() } else { val_name_w.as_ptr() },
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            buf.as_mut_ptr() as *mut u8,
            &mut data_len,
        );

        RegCloseKey(key);
        if query_status == ERROR_SUCCESS {
            let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
            String::from_utf16(&buf[..len]).ok()
        } else {
            None
        }
    }
}

fn reg_delete_tree(hkey: HKEY, subkey: &str) -> bool {
    unsafe {
        let subkey_w = to_wide(subkey);
        RegDeleteTreeW(hkey, subkey_w.as_ptr()) == ERROR_SUCCESS
    }
}

const SUPPORTED_EXTENSIONS: &[&str] = &[
    ".txt", ".md", ".markdown", ".log", ".json", ".yaml", ".yml", ".toml", ".xml",
    ".ini", ".cfg", ".csv", ".tsv", ".js", ".ts", ".rs", ".py", ".html", ".css",
];

pub fn register_associations(exe_path: &Path) -> Result<(), String> {
    let exe_str = exe_path.to_str().ok_or("Invalid executable path")?;
    let open_cmd = format!("\"{}\" \"%1\"", exe_str);
    let icon_cmd = format!("\"{}\",0", exe_str);

    // 1. Register ProgID: HKCU\Software\Classes\Cathet.Document
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document", "", "Cathet Document");
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document\\DefaultIcon", "", &icon_cmd);
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document\\shell\\open\\command", "", &open_cmd);

    // 2. Register Application: HKCU\Software\Classes\Applications\cathet.exe
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe", "FriendlyAppName", "Cathet");
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe\\DefaultIcon", "", &icon_cmd);
    reg_set_string(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe\\shell\\open\\command", "", &open_cmd);

    for ext in SUPPORTED_EXTENSIONS {
        let subkey = format!("Software\\Classes\\Applications\\cathet.exe\\SupportedTypes");
        reg_set_string(HKEY_CURRENT_USER, &subkey, ext, "");

        let openwith_key = format!("Software\\Classes\\{}\\OpenWithProgids", ext);
        reg_set_string(HKEY_CURRENT_USER, &openwith_key, "Cathet.Document", "");
    }

    // 3. Register Capabilities & RegisteredApplications for Windows Default Apps UI
    reg_set_string(HKEY_CURRENT_USER, "Software\\Cathet\\Capabilities", "ApplicationName", "Cathet");
    reg_set_string(HKEY_CURRENT_USER, "Software\\Cathet\\Capabilities", "ApplicationDescription", "Lightweight frosted glass text & markdown editor for Windows");
    for ext in SUPPORTED_EXTENSIONS {
        let assoc_key = "Software\\Cathet\\Capabilities\\FileAssociations";
        reg_set_string(HKEY_CURRENT_USER, assoc_key, ext, "Cathet.Document");
    }
    reg_set_string(HKEY_CURRENT_USER, "Software\\RegisteredApplications", "Cathet", "Software\\Cathet\\Capabilities");

    // 4. Notify Windows Explorer shell of association change
    unsafe {
        SHChangeNotify(SHCNE_ASSOCCHANGED as i32, SHCNF_IDLIST, std::ptr::null(), std::ptr::null());
    }

    Ok(())
}

pub fn unregister_associations() -> Result<(), String> {
    reg_delete_tree(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document");
    reg_delete_tree(HKEY_CURRENT_USER, "Software\\Classes\\Applications\\cathet.exe");
    reg_delete_tree(HKEY_CURRENT_USER, "Software\\Cathet");

    // Remove RegisteredApplications entry
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

pub fn read_registered_exe() -> Option<String> {
    let cmd = reg_get_string(HKEY_CURRENT_USER, "Software\\Classes\\Cathet.Document\\shell\\open\\command", "")?;
    let trimmed = cmd.trim();
    if trimmed.starts_with('"') {
        trimmed.split('"').nth(1).map(|s| s.to_string())
    } else {
        trimmed.split_whitespace().next().map(|s| s.to_string())
    }
}

pub fn self_heal_if_moved() -> bool {
    let current_exe = match env::current_exe() {
        Ok(p) => p,
        Err(_) => return false,
    };

    if let Some(registered) = read_registered_exe() {
        let reg_path = PathBuf::from(&registered);
        if reg_path != current_exe {
            let _ = register_associations(&current_exe);
            return true;
        }
    }
    false
}

#[tauri::command]
pub async fn get_association_status() -> Result<AssociationStatus, String> {
    let current_exe = env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let registered_exe = read_registered_exe();
    let is_registered = registered_exe.is_some();

    Ok(AssociationStatus {
        is_registered,
        current_exe_path: current_exe,
        registered_exe_path: registered_exe,
    })
}

#[tauri::command]
pub async fn configure_default_app() -> Result<AssociationStatus, String> {
    let current_exe = env::current_exe().map_err(|e| e.to_string())?;
    register_associations(&current_exe)?;

    // Launch modern Windows Default Apps Settings page
    let _ = tauri_plugin_opener::open_url("ms-settings:defaultapps", None::<&str>);

    get_association_status().await
}

#[tauri::command]
pub async fn unregister_default_app() -> Result<AssociationStatus, String> {
    unregister_associations()?;
    get_association_status().await
}
