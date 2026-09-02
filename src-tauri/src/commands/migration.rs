use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::thread::sleep;
use std::time::Duration;

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
    for _ in 0..20 {
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

    // Spawn the freshly replaced executable at its original shortcut location
    let _ = Command::new(&target_path).spawn();

    // Schedule cleanup of the temporary staging executable on exit
    #[cfg(target_os = "windows")]
    {
        let current_str = current_exe.to_string_lossy().to_string();
        let _ = Command::new("cmd")
            .args(["/C", "timeout", "2", ">nul", "&", "del", "/f", "/q", &current_str])
            .spawn();
    }

    true
}
