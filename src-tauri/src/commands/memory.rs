//! Memory management and working set compaction service for Windows.
//!
//! Compacts process working sets and signals Windows Memory Manager to reclaim
//! idle, unreferenced pages, keeping memory consumption minimal.

/// Flushes unreferenced physical pages from the process working set to the system standby list.
/// Callable directly from Rust lifecycle hooks or via Tauri IPC command from the UI.
#[tauri::command]
pub fn trim_memory() {
    #[cfg(target_os = "windows")]
    unsafe {
        windows_sys::Win32::System::Threading::SetProcessWorkingSetSize(
            windows_sys::Win32::System::Threading::GetCurrentProcess(),
            usize::MAX,
            usize::MAX,
        );
    }
}
