//! Memory management and working set compaction service for Windows.
//!
//! Compacts process working sets across the entire Cathet process tree
//! (host executable and all descendant WebView2 helper processes), signaling
//! Windows Memory Manager to reclaim idle, unreferenced pages.

#[cfg(target_os = "windows")]
use std::collections::{HashSet, VecDeque};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Threading::{
    GetCurrentProcess, GetCurrentProcessId, OpenProcess, SetProcessWorkingSetSize,
    PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_QUOTA,
};

/// Flushes unreferenced physical pages from the host process and all descendant
/// WebView2 helper processes (Manager, GPU, Utility, Renderers) to the standby list.
#[tauri::command]
pub fn trim_memory() {
    #[cfg(target_os = "windows")]
    unsafe {
        // 1. Flush host process working set
        SetProcessWorkingSetSize(GetCurrentProcess(), usize::MAX, usize::MAX);

        // 2. Discover and trim all descendant WebView2 child processes
        let current_pid = GetCurrentProcessId();
        let descendant_pids = collect_descendant_pids(current_pid);

        for pid in descendant_pids {
            let process_handle = OpenProcess(
                PROCESS_SET_QUOTA | PROCESS_QUERY_LIMITED_INFORMATION,
                0,
                pid,
            );
            if !process_handle.is_null() {
                SetProcessWorkingSetSize(process_handle, usize::MAX, usize::MAX);
                CloseHandle(process_handle);
            }
        }
    }
}

/// Collects all descendant process IDs recursively using a Toolhelp32 process snapshot.
#[cfg(target_os = "windows")]
unsafe fn collect_descendant_pids(root_pid: u32) -> Vec<u32> {
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if snapshot == INVALID_HANDLE_VALUE {
        return Vec::new();
    }

    let mut entry: PROCESSENTRY32W = std::mem::zeroed();
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

    let mut pairs: Vec<(u32, u32)> = Vec::new(); // (pid, parent_pid)

    if Process32FirstW(snapshot, &mut entry) != 0 {
        loop {
            pairs.push((entry.th32ProcessID, entry.th32ParentProcessID));
            if Process32NextW(snapshot, &mut entry) == 0 {
                break;
            }
        }
    }

    CloseHandle(snapshot);

    // BFS to find all descendants of root_pid
    let mut descendants = Vec::new();
    let mut queue = VecDeque::new();
    let mut visited = HashSet::new();

    queue.push_back(root_pid);
    visited.insert(root_pid);

    while let Some(parent) = queue.pop_front() {
        for &(child_pid, ppid) in &pairs {
            if ppid == parent && !visited.contains(&child_pid) {
                visited.insert(child_pid);
                descendants.push(child_pid);
                queue.push_back(child_pid);
            }
        }
    }

    descendants
}

