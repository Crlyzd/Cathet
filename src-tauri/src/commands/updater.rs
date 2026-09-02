use serde::{Deserialize, Serialize};
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;

const GITHUB_REPO: &str = "Crlyzd/Cathet";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub update_available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    let url = format!("https://api.github.com/repos/{}/releases/latest", GITHUB_REPO);
    let client = reqwest::Client::builder()
        .user_agent("Cathet-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release: {}", e))?;

    if !response.status().is_success() {
        return Ok(UpdateInfo {
            update_available: false,
            current_version: CURRENT_VERSION.into(),
            latest_version: CURRENT_VERSION.into(),
            download_url: String::new(),
            release_notes: String::new(),
        });
    }

    let release: GithubRelease = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release: {}", e))?;

    let latest_tag = release.tag_name.trim_start_matches('v');
    let has_update = is_newer_version(latest_tag, CURRENT_VERSION);

    let matching_asset = find_matching_asset(&release.assets);
    let download_url = matching_asset
        .map(|a| a.browser_download_url.clone())
        .unwrap_or_default();

    Ok(UpdateInfo {
        update_available: has_update && !download_url.is_empty(),
        current_version: CURRENT_VERSION.into(),
        latest_version: latest_tag.into(),
        download_url,
        release_notes: release.body.unwrap_or_default(),
    })
}

use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub percent: f64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

#[tauri::command]
pub async fn download_update_payload(
    app_handle: AppHandle,
    download_url: String,
) -> Result<String, String> {
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

    let (mut file, staging_exe) = create_update_staging_file()?;

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

    Ok(staging_exe.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn install_and_restart(temp_path: String) -> Result<(), String> {
    let current_exe = env::current_exe().map_err(|e| e.to_string())?;
    Command::new(&temp_path)
        .arg("--replace-old")
        .arg(&current_exe)
        .spawn()
        .map_err(|e| format!("Failed to launch updater: {}", e))?;

    std::process::exit(0);
}

#[tauri::command]
pub async fn download_and_install_update(download_url: String) -> Result<(), String> {
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

    let (mut file, staging_exe) = create_update_staging_file()?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    drop(file);

    let current_exe = env::current_exe().map_err(|e| e.to_string())?;

    Command::new(&staging_exe)
        .arg("--replace-old")
        .arg(&current_exe)
        .spawn()
        .map_err(|e| format!("Failed to launch updater: {}", e))?;

    std::process::exit(0);
}

fn create_update_staging_file() -> Result<(File, PathBuf), String> {
    let temp_dir = env::temp_dir().join("cathet");
    let _ = std::fs::create_dir_all(&temp_dir);
    let temp_exe = temp_dir.join("cathet_update.exe");
    let _ = std::fs::remove_file(&temp_exe);

    let file = File::create(&temp_exe).map_err(|e| format!("Failed to create update file: {}", e))?;
    Ok((file, temp_exe))
}

fn find_matching_asset(assets: &[GithubAsset]) -> Option<&GithubAsset> {
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

    // Fallback: any .exe in release
    assets.iter().find(|a| a.name.to_lowercase().ends_with(".exe"))
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.split('.')
            .filter_map(|s| s.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().ok())
            .collect()
    };

    let v_latest = parse(latest);
    let v_current = parse(current);

    v_latest > v_current
}
