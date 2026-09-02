use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::thread::sleep;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Handles startup migration if Cathet was launched by the updater with --replace-old.
/// Returns true if migration was handled and the process should terminate immediately.
pub fn handle_migration_if_present() -> bool {
    let args: Vec<String> = env::args().collect();
    let mut target_old_path: Option<PathBuf> = None;

    for i in 0..args.len() {
        if args[i] == "--replace-old" && i + 1 < args.len() {
            target_old_path = Some(PathBuf::from(&args[i + 1]));
            break;
        }
    }

    let target_path = match target_old_path {
        Some(path) => path,
        None => return false,
    };

    let current_exe = match env::current_exe() {
        Ok(exe) => exe,
        Err(_) => return false,
    };

    // Wait for the previous instance to terminate and release file locks
    for _ in 0..25 {
        sleep(Duration::from_millis(150));
        if fs::remove_file(&target_path).is_ok() {
            break;
        }
    }

    // Overwrite/replace target executable to preserve desktop & taskbar shortcuts
    if let Err(_) = fs::copy(&current_exe, &target_path) {
        // Fallback: spawn current exe directly if copy failed
        let _ = Command::new(&current_exe).spawn();
        return true;
    }

    // Spawn the freshly replaced executable with cleanup flag for the staging binary
    let _ = Command::new(&target_path)
        .arg("--cleanup-update")
        .arg(&current_exe)
        .spawn();

    // Secondary fallback: schedule completely hidden cleanup in case target terminates prematurely
    #[cfg(target_os = "windows")]
    {
        let current_str = current_exe.to_string_lossy();
        let cmd_str = format!("ping 127.0.0.1 -n 2 >nul & del /f /q \"{}\"", current_str);
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", &cmd_str]);
        cmd.creation_flags(CREATE_NO_WINDOW);
        let _ = cmd.spawn();
    }

    true
}

/// Handles background cleanup of the temporary updater executable if Cathet was spawned with --cleanup-update.
/// Also proactively cleans up any orphaned cathet_update.exe left behind from earlier legacy updates.
pub fn handle_cleanup_if_present() {
    let args: Vec<String> = env::args().collect();
    for i in 0..args.len() {
        if args[i] == "--cleanup-update" && i + 1 < args.len() {
            let target = PathBuf::from(&args[i + 1]);
            std::thread::spawn(move || {
                for _ in 0..30 {
                    sleep(Duration::from_millis(200));
                    if fs::remove_file(&target).is_ok() {
                        if let Some(parent) = target.parent() {
                            let _ = fs::remove_dir_all(parent);
                        }
                        break;
                    }
                }
            });
            break;
        }
    }

    // Proactively clean up any orphaned cathet_update.exe next to the running executable
    if let Ok(current_exe) = env::current_exe() {
        if let Some(app_dir) = current_exe.parent() {
            let legacy_candidate = app_dir.join("cathet_update.exe");
            if legacy_candidate != current_exe && legacy_candidate.exists() {
                std::thread::spawn(move || {
                    for _ in 0..10 {
                        sleep(Duration::from_millis(300));
                        if fs::remove_file(&legacy_candidate).is_ok() {
                            break;
                        }
                    }
                });
            }
        }
    }

    // Also clean up any lingering %TEMP%\cathet folder from past update sessions
    let temp_cathet = env::temp_dir().join("cathet");
    if temp_cathet.exists() {
        std::thread::spawn(move || {
            sleep(Duration::from_secs(1));
            let _ = fs::remove_dir_all(&temp_cathet);
        });
    }
}
