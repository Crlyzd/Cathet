use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LinuxDesktopInfo {
    pub is_linux: bool,
    pub supports_blur: bool,
    pub accent_color: Option<String>,
}

#[tauri::command]
pub async fn get_linux_desktop_info() -> Result<LinuxDesktopInfo, String> {
    #[cfg(target_os = "linux")]
    {
        let de = format!(
            "{} {}",
            std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default(),
            std::env::var("XDG_SESSION_DESKTOP").unwrap_or_default()
        )
        .to_lowercase();
        let supports_blur = de.trim().is_empty()
            || de.contains("kde")
            || de.contains("plasma")
            || de.contains("hyprland")
            || de.contains("wayfire");
        let accent_color = read_kde_or_portal_accent();
        return Ok(LinuxDesktopInfo {
            is_linux: true,
            supports_blur,
            accent_color,
        });
    }
    #[cfg(not(target_os = "linux"))]
    {
        Ok(LinuxDesktopInfo {
            is_linux: false,
            supports_blur: false,
            accent_color: None,
        })
    }
}

#[cfg(target_os = "linux")]
fn read_kde_or_portal_accent() -> Option<String> {
    if let Ok(home) = std::env::var("HOME") {
        let kdeglobals = std::path::PathBuf::from(home).join(".config/kdeglobals");
        if let Ok(content) = std::fs::read_to_string(kdeglobals) {
            for line in content.lines() {
                if let Some(val) = line.trim().strip_prefix("AccentColor=") {
                    let parts: Vec<u8> = val
                        .split(',')
                        .filter_map(|s| s.trim().parse::<u8>().ok())
                        .collect();
                    if parts.len() == 3 {
                        return Some(format!("rgb({}, {}, {})", parts[0], parts[1], parts[2]));
                    }
                }
            }
        }
    }
    let out = std::process::Command::new("gdbus")
        .args([
            "call",
            "--session",
            "--dest",
            "org.freedesktop.portal.Desktop",
            "--object-path",
            "/org/freedesktop/portal/desktop",
            "--method",
            "org.freedesktop.portal.Settings.Read",
            "org.freedesktop.appearance",
            "accent-color",
        ])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let inner = text.split("((").nth(1)?.split("))").next()?;
    let rgb: Vec<u8> = inner
        .split(',')
        .filter_map(|s| s.trim().parse::<f64>().ok())
        .filter(|&v| (0.0..=1.0).contains(&v))
        .map(|v| (v * 255.0).round() as u8)
        .collect();
    if rgb.len() == 3 {
        Some(format!("rgb({}, {}, {})", rgb[0], rgb[1], rgb[2]))
    } else {
        None
    }
}

