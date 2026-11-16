fn main() {
    tauri_build::build();
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        append_doc_icon_to_tauri_resources();
    }
}

fn find_newest(glob_root: &str, suffix: &[&str]) -> Option<std::path::PathBuf> {
    let mut dirs: Vec<_> = std::fs::read_dir(glob_root)
        .ok()?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .collect();
    dirs.sort();
    for dir in dirs.into_iter().rev() {
        let mut candidate = dir;
        for part in suffix {
            candidate = candidate.join(part);
        }
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

fn find_msvc_cvtres() -> Option<std::path::PathBuf> {
    for year in ["2022", "2019"] {
        let base = format!(r"C:\Program Files\Microsoft Visual Studio\{year}");
        for edition in ["Community", "Professional", "Enterprise", "BuildTools"] {
            let msvc = format!(r"{base}\{edition}\VC\Tools\MSVC");
            if let Some(p) = find_newest(&msvc, &["bin", "Hostx64", "x64", "cvtres.exe"]) {
                return Some(p);
            }
        }
    }
    None
}

fn append_doc_icon_to_tauri_resources() {
    use std::{env, fs, path::PathBuf, process::Command};

    println!("cargo:rerun-if-changed=icons/doc-icon.ico");
    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR not set"));
    let rc_path = out_dir.join("resource.rc");
    let mut rc = fs::read_to_string(&rc_path).expect("failed to read tauri resource.rc");

    let doc_ico = env::current_dir()
        .expect("cwd")
        .join("icons")
        .join("doc-icon.ico");
    let escaped = doc_ico.to_string_lossy().replace('\\', "\\\\");
    rc.push_str(&format!("\n40001 ICON \"{escaped}\"\n"));
    fs::write(&rc_path, rc).expect("failed to update resource.rc");

    let rc_exe = find_newest(r"C:\Program Files (x86)\Windows Kits\10\bin", &["x64", "rc.exe"])
        .unwrap_or_else(|| PathBuf::from("rc.exe"));
    let cvtres_exe = find_msvc_cvtres().unwrap_or_else(|| PathBuf::from("cvtres.exe"));

    let res_path = out_dir.join("resource.res");
    let lib_path = out_dir.join("resource.lib");
    let machine = match env::var("CARGO_CFG_TARGET_ARCH").as_deref() {
        Ok("aarch64") => "/MACHINE:ARM64",
        _ => "/MACHINE:X64",
    };

    let rc_status = Command::new(&rc_exe)
        .args(["/nologo", "/fo"])
        .arg(&res_path)
        .arg(&rc_path)
        .status()
        .expect("failed to invoke rc.exe");
    assert!(rc_status.success(), "rc.exe failed");

    let cvt_status = Command::new(&cvtres_exe)
        .args(["/nologo", machine])
        .arg(format!("/OUT:{}", lib_path.display()))
        .arg(&res_path)
        .status()
        .expect("failed to invoke cvtres.exe");
    assert!(cvt_status.success(), "cvtres.exe failed");
}
