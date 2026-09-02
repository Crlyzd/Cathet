// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if cathet::commands::migration::handle_migration_if_present() {
        return;
    }

    cathet::run();
}
