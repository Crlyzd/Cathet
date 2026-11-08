#![allow(dead_code, unused_imports)]

use super::updater_target::{
    create_update_staging_file, find_matching_asset, is_msix_packaged, is_newer_version,
    GithubAsset,
};
#[cfg(target_os = "linux")]
use super::updater_target::{detect_linux_package_type, launch_linux_system_installer, LinuxPackageType};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

const GITHUB_REPO: &str = "Crlyzd/Cathet";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub update_available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
    pub is_store_package: bool,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GithubAsset>,
}

#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub percent: f64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

fn empty_update_info() -> UpdateInfo {
    UpdateInfo {
        update_available: false,
        current_version: CURRENT_VERSION.into(),
        latest_version: CURRENT_VERSION.into(),
        download_url: String::new(),
        release_notes: String::new(),
        is_store_package: is_msix_packaged(),
    }
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    #[cfg(target_os = "android")]
    {
        return Ok(empty_update_info());
    }

    #[cfg(not(target_os = "android"))]
    {
        if is_msix_packaged() {
            return Ok(empty_update_info());
        }

        let url = format!("https://api.github.com/repos/{}/releases/latest", GITHUB_REPO);
        let client = reqwest::Client::builder().user_agent("Cathet-Updater").build().map_err(|e| e.to_string())?;
        let response = client.get(&url).send().await.map_err(|e| format!("Failed to fetch release: {}", e))?;

        if !response.status().is_success() {
            return Ok(empty_update_info());
        }

        let release: GithubRelease = response.json().await.map_err(|e| format!("Failed to parse release: {}", e))?;
        let latest_tag = release.tag_name.trim_start_matches('v');
        let has_update = is_newer_version(latest_tag, CURRENT_VERSION);
        let download_url = find_matching_asset(&release.assets).map(|a| a.browser_download_url.clone()).unwrap_or_default();

        Ok(UpdateInfo {
            update_available: has_update && !download_url.is_empty(),
            current_version: CURRENT_VERSION.into(),
            latest_version: latest_tag.into(),
            download_url,
            release_notes: release.body.unwrap_or_default(),
            is_store_package: false,
        })
    }
}

#[tauri::command]
pub async fn download_update_payload(
    app_handle: AppHandle,
    download_url: String,
) -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        let _ = (app_handle, download_url);
        return Err("Self-updating executable is only supported on desktop.".into());
    }

    #[cfg(not(target_os = "android"))]
    {
        if is_msix_packaged() {
            return Err("Updates for Microsoft Store app are managed by Windows Store.".into());
        }
        if download_url.is_empty() {
            return Err("Download URL is empty".into());
        }

        let client = reqwest::Client::builder()
            .user_agent("Cathet-Updater")
            .build()
            .map_err(|e| e.to_string())?;

        let mut response = client
            .get(&download_url)
            .send()
            .await
            .map_err(|e| format!("Failed to download update: {}", e))?;

        let total_bytes = response.content_length().unwrap_or(0);
        let mut downloaded_bytes: u64 = 0;
        let (mut file, staging_path) = create_update_staging_file(&download_url)?;

        while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
            file.write_all(&chunk).map_err(|e| e.to_string())?;
            downloaded_bytes += chunk.len() as u64;
            let percent = if total_bytes > 0 {
                (downloaded_bytes as f64 / total_bytes as f64) * 100.0
            } else {
                0.0
            };
            let _ = app_handle.emit(
                "update:progress",
                DownloadProgress {
                    percent,
                    downloaded_bytes,
                    total_bytes,
                },
            );
        }

        drop(file);
        let _ = app_handle.emit(
            "update:progress",
            DownloadProgress {
                percent: 100.0,
                downloaded_bytes,
                total_bytes,
            },
        );
        Ok(staging_path.to_string_lossy().to_string())
    }
}

#[tauri::command]
pub async fn install_and_restart(temp_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if is_msix_packaged() {
            return Err("Updates for Microsoft Store app are managed by Windows Store.".into());
        }
        let current_exe = env::current_exe().map_err(|e| e.to_string())?;
        std::process::Command::new(&temp_path)
            .arg("--replace-old")
            .arg(&current_exe)
            .spawn()
            .map_err(|e| format!("Failed to launch updater: {}", e))?;
        std::process::exit(0);
    }
    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let p = std::path::Path::new(&temp_path);
        let _ = std::fs::set_permissions(p, std::fs::Permissions::from_mode(0o755));

        let pkg_type = detect_linux_package_type();
        if pkg_type == LinuxPackageType::Deb || pkg_type == LinuxPackageType::Rpm {
            launch_linux_system_installer(p)?;
            std::process::exit(0);
        }

        let target_exe = env::var("APPIMAGE")
            .ok()
            .filter(|s| !s.is_empty())
            .map(PathBuf::from)
            .or_else(|| env::current_exe().ok())
            .ok_or_else(|| "Failed to resolve executable path".to_string())?;

        std::fs::copy(&temp_path, &target_exe)
            .map_err(|e| format!("Failed to replace AppImage ({}): {}", target_exe.display(), e))?;
        let _ = std::fs::set_permissions(&target_exe, std::fs::Permissions::from_mode(0o755));
        let _ = std::fs::remove_file(&temp_path);

        std::process::Command::new(&target_exe)
            .spawn()
            .map_err(|e| format!("Failed to relaunch updated AppImage: {}", e))?;
        std::process::exit(0);
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = temp_path;
        Err("In-app auto restart is only supported on Windows and Linux desktop.".into())
    }
}

#[tauri::command]
pub async fn download_and_install_update(download_url: String) -> Result<(), String> {
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        if is_msix_packaged() {
            return Err("Updates for Microsoft Store app are managed by Windows Store.".into());
        }
        if download_url.is_empty() {
            return Err("Download URL is empty".into());
        }
        let client = reqwest::Client::builder()
            .user_agent("Cathet-Updater")
            .build()
            .map_err(|e| e.to_string())?;
        let response = client
            .get(&download_url)
            .send()
            .await
            .map_err(|e| format!("Failed to download update: {}", e))?;
        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read update payload: {}", e))?;
        let (mut file, staging_exe) = create_update_staging_file(&download_url)?;
        file.write_all(&bytes).map_err(|e| e.to_string())?;
        drop(file);
        return install_and_restart(staging_exe.to_string_lossy().to_string()).await;
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = download_url;
        Err("Self-updating executable is only supported on Windows and Linux desktop.".into())
    }
}
