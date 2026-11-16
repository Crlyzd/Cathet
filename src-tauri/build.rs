fn main() {
    tauri_build::build();
    #[cfg(target_os = "windows")]
    embed_resource::compile("doc_icon.rc", embed_resource::NONE);
}
