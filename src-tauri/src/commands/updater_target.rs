#![allow(dead_code, unused_imports)]

use serde::Deserialize;
use std::env;
use std::fs::File;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
pub struct GithubAsset {
    pub name: String,
    pub browser_download_url: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LinuxPackageType {
    AppImage,
    Deb,
    Rpm,
    Generic,
}

#[cfg(target_os = "windows")]
pub fn is_msix_packaged() -> bool {
    extern "system" {
        fn GetCurrentPackageFamilyName(len: *mut u32, name: *mut u16) -> u32;
    }
    let mut len: u32 = 0;
    unsafe {
        let rc = GetCurrentPackageFamilyName(&mut len, std::ptr::null_mut());
        rc != 15700 && rc != 120
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_msix_packaged() -> bool {
    false
}

#[cfg(target_os = "linux")]
pub fn detect_linux_package_type() -> LinuxPackageType {
    if env::var("APPIMAGE").is_ok() {
        return LinuxPackageType::AppImage;
    }
    if Path::new("/etc/debian_version").exists() {
        return LinuxPackageType::Deb;
    }
    if Path::new("/etc/fedora-release").exists()
        || Path::new("/etc/redhat-release").exists()
        || Path::new("/etc/SuSE-release").exists()
    {
        return LinuxPackageType::Rpm;
    }
    LinuxPackageType::Generic
}

pub fn find_matching_asset<'a>(assets: &'a [GithubAsset]) -> Option<&'a GithubAsset> {
    #[cfg(target_os = "android")]
    {
        assets.iter().find(|a| a.name.to_lowercase().ends_with(".apk"))
    }
    #[cfg(target_os = "windows")]
    {
        if is_msix_packaged() {
            return None;
        }
        let is_arm64 = cfg!(target_arch = "aarch64");
        for asset in assets {
            let name = asset.name.to_lowercase();
            if !name.ends_with(".exe") {
                continue;
            }
            if is_arm64 && (name.contains("arm64") || name.contains("aarch64")) {
                return Some(asset);
            } else if !is_arm64 && (name.contains("x64") || name.contains("x86_64") || !name.contains("arm")) {
                return Some(asset);
            }
        }
        assets.iter().find(|a| a.name.to_lowercase().ends_with(".exe"))
    }
    #[cfg(target_os = "linux")]
    {
        let pkg_type = detect_linux_package_type();
        let target_ext = match pkg_type {
            LinuxPackageType::AppImage => ".appimage",
            LinuxPackageType::Deb => ".deb",
            LinuxPackageType::Rpm => ".rpm",
            LinuxPackageType::Generic => ".appimage",
        };
        for asset in assets {
            let name = asset.name.to_lowercase();
            if name.ends_with(target_ext) {
                return Some(asset);
            }
        }
        assets.iter().find(|a| a.name.to_lowercase().ends_with(".appimage"))
    }
    #[cfg(not(any(target_os = "android", target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

pub fn create_update_staging_file(download_url: &str) -> Result<(File, PathBuf), String> {
    let ext = if cfg!(target_os = "android") {
        "cathet_update.apk"
    } else if cfg!(target_os = "linux") {
        let lower = download_url.to_lowercase();
        if lower.ends_with(".deb") {
            "cathet_update.deb"
        } else if lower.ends_with(".rpm") {
            "cathet_update.rpm"
        } else {
            "cathet_update.AppImage"
        }
    } else {
        "cathet_update.exe"
    };

    let staging_dir = if cfg!(target_os = "linux") && (ext.ends_with(".deb") || ext.ends_with(".rpm")) {
        dirs_next_or_home_downloads().unwrap_or_else(|| env::temp_dir().join("cathet"))
    } else {
        env::temp_dir().join("cathet")
    };

    let _ = std::fs::create_dir_all(&staging_dir);
    let staging_file = staging_dir.join(ext);
    let _ = std::fs::remove_file(&staging_file);
    let file = File::create(&staging_file).map_err(|e| format!("Failed to create update file: {}", e))?;
    Ok((file, staging_file))
}

fn dirs_next_or_home_downloads() -> Option<PathBuf> {
    env::var_os("HOME").map(|h| PathBuf::from(h).join("Downloads"))
}

#[cfg(target_os = "linux")]
pub fn launch_linux_system_installer(path: &Path) -> Result<(), String> {
    std::process::Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to launch system installer via xdg-open: {}", e))?;
    Ok(())
}

pub fn is_newer_version(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.split('.')
            .filter_map(|s| {
                s.chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>()
                    .parse()
                    .ok()
            })
            .collect()
    };
    parse(latest) > parse(current)
}
