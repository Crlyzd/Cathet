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

pub fn find_android_apk_for_arch<'a>(assets: &'a [GithubAsset], arch: &str) -> Option<&'a GithubAsset> {
    let apks: Vec<&GithubAsset> = assets
        .iter()
        .filter(|a| a.name.to_lowercase().ends_with(".apk"))
        .collect();
    let has = |a: &GithubAsset, pat: &str| a.name.to_lowercase().contains(pat);

    if arch == "aarch64" {
        if let Some(a) = apks.iter().find(|a| has(a, "arm64") || has(a, "aarch64")) {
            return Some(*a);
        }
    } else if arch == "arm" {
        if let Some(a) = apks.iter().find(|a| has(a, "armeabi") || has(a, "armv7")) {
            return Some(*a);
        }
    } else if let Some(a) = apks.iter().find(|a| has(a, arch)) {
        return Some(*a);
    }

    if let Some(a) = apks.iter().find(|a| has(a, "universal")) {
        return Some(*a);
    }
    apks.into_iter().find(|a| {
        !has(a, "arm64")
            && !has(a, "aarch64")
            && !has(a, "armeabi")
            && !has(a, "armv7")
            && !has(a, "x86")
    })
}

pub fn find_windows_exe_for_arch<'a>(assets: &'a [GithubAsset], is_arm64: bool) -> Option<&'a GithubAsset> {
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

pub fn find_linux_pkg_for_arch<'a>(
    assets: &'a [GithubAsset],
    target_ext: &str,
    arch: &str,
) -> Option<&'a GithubAsset> {
    let is_arm64 = arch == "aarch64";
    let pick = |ext: &str| -> Option<&'a GithubAsset> {
        let matching: Vec<&GithubAsset> = assets
            .iter()
            .filter(|a| a.name.to_lowercase().ends_with(ext))
            .collect();
        if let Some(a) = matching.iter().find(|a| {
            let n = a.name.to_lowercase();
            if is_arm64 {
                n.contains("arm64") || n.contains("aarch64")
            } else {
                n.contains("x86_64") || n.contains("amd64") || n.contains("x64")
                    || (!n.contains("arm64") && !n.contains("aarch64"))
            }
        }) {
            return Some(*a);
        }
        matching.into_iter().next()
    };

    pick(target_ext).or_else(|| if target_ext != ".appimage" { pick(".appimage") } else { None })
}

pub fn find_matching_asset<'a>(assets: &'a [GithubAsset]) -> Option<&'a GithubAsset> {
    #[cfg(target_os = "android")]
    {
        find_android_apk_for_arch(assets, std::env::consts::ARCH)
    }
    #[cfg(target_os = "windows")]
    {
        if is_msix_packaged() {
            return None;
        }
        find_windows_exe_for_arch(assets, cfg!(target_arch = "aarch64"))
    }
    #[cfg(target_os = "linux")]
    {
        let target_ext = match detect_linux_package_type() {
            LinuxPackageType::AppImage => ".appimage",
            LinuxPackageType::Deb => ".deb",
            LinuxPackageType::Rpm => ".rpm",
            LinuxPackageType::Generic => ".appimage",
        };
        find_linux_pkg_for_arch(assets, target_ext, std::env::consts::ARCH)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn full_release_assets() -> Vec<GithubAsset> {
        [
            "cathet-release-key.asc",
            "cathet-v5.5.1-amd64.deb",
            "cathet-v5.5.1-amd64.deb.asc",
            "cathet-v5.5.1-android-arm64.apk",
            "cathet-v5.5.1-android-universal.apk",
            "cathet-v5.5.1-android.apk",
            "cathet-v5.5.1-arm64.exe",
            "cathet-v5.5.1-x64.exe",
            "cathet-v5.5.1-x86_64.AppImage",
            "cathet-v5.5.1-x86_64.AppImage.asc",
            "cathet-v5.5.1-x86_64.rpm",
            "cathet-v5.5.1.msixbundle",
        ]
        .iter()
        .map(|n| GithubAsset { name: (*n).into(), browser_download_url: format!("https://example.com/{}", n) })
        .collect()
    }

    #[test]
    fn test_cross_platform_asset_matching() {
        let assets = full_release_assets();
        assert_eq!(find_android_apk_for_arch(&assets, "aarch64").unwrap().name, "cathet-v5.5.1-android-arm64.apk");
        assert_eq!(find_android_apk_for_arch(&assets, "arm").unwrap().name, "cathet-v5.5.1-android-universal.apk");
        assert_eq!(find_android_apk_for_arch(&assets, "x86_64").unwrap().name, "cathet-v5.5.1-android-universal.apk");
        assert_eq!(find_windows_exe_for_arch(&assets, false).unwrap().name, "cathet-v5.5.1-x64.exe");
        assert_eq!(find_windows_exe_for_arch(&assets, true).unwrap().name, "cathet-v5.5.1-arm64.exe");
        assert_eq!(find_linux_pkg_for_arch(&assets, ".deb", "x86_64").unwrap().name, "cathet-v5.5.1-amd64.deb");
        assert_eq!(find_linux_pkg_for_arch(&assets, ".rpm", "x86_64").unwrap().name, "cathet-v5.5.1-x86_64.rpm");
        assert_eq!(find_linux_pkg_for_arch(&assets, ".appimage", "x86_64").unwrap().name, "cathet-v5.5.1-x86_64.AppImage");
    }
}
