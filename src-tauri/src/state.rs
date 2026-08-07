use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use std::path::PathBuf;

pub struct AppState {
    pub current_file_path: Mutex<Option<PathBuf>>,
    pub is_always_on_top: AtomicBool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            current_file_path: Mutex::new(None),
            is_always_on_top: AtomicBool::new(false),
        }
    }
}
