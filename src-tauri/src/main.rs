// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn configure_webview_environment() {
    // Process consolidation & lean memory flags:
    // - NetworkServiceInProcess: folds separate network process into main browser process
    // - disable-crash-reporter: eliminates dedicated Crashpad process
    // - disable-features=SpareRendererForSitePerProcess: prevents warm idle spare renderers
    // - renderer-process-limit=1: enforces single renderer process limit
    // - disable-background-timer-throttling=false: enables aggressive timer throttling when inactive
    const OPTIMIZED_FLAGS: &str = "--enable-features=NetworkServiceInProcess --disable-crash-reporter --disable-features=SpareRendererForSitePerProcess --renderer-process-limit=1 --disable-background-timer-throttling=false";

    match std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS") {
        Ok(existing) if !existing.trim().is_empty() => {
            if !existing.contains("NetworkServiceInProcess") {
                let combined = format!("{} {}", existing.trim(), OPTIMIZED_FLAGS);
                std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", combined);
            }
        }
        _ => {
            std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", OPTIMIZED_FLAGS);
        }
    }
}

fn main() {
    if cathet::commands::migration::handle_migration_if_present() {
        return;
    }

    cathet::commands::migration::handle_cleanup_if_present();

    #[cfg(target_os = "windows")]
    configure_webview_environment();

    cathet::run();
}

