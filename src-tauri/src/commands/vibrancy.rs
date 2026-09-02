use tauri::WebviewWindow;
use window_vibrancy::{apply_acrylic, apply_blur, apply_mica};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::HWND;
#[cfg(target_os = "windows")]
use windows_sys::Win32::Graphics::Dwm::DwmSetWindowAttribute;

#[cfg(target_os = "windows")]
const DWMWA_USE_IMMERSIVE_DARK_MODE: u32 = 20;
#[cfg(target_os = "windows")]
const DWMWA_SYSTEMBACKDROP_TYPE: u32 = 38;
#[cfg(target_os = "windows")]
const DWMSBT_TRANSIENTWINDOW: u32 = 3; // Acrylic
#[cfg(target_os = "windows")]
const DWMSBT_MAINWINDOW: u32 = 2; // Mica
#[cfg(target_os = "windows")]
const DWMWA_MICA_EFFECT: u32 = 1029;

#[cfg(target_os = "windows")]
#[repr(C)]
struct OsVersionInfoExW {
    dw_os_version_info_size: u32,
    dw_major_version: u32,
    dw_minor_version: u32,
    dw_build_number: u32,
    dw_platform_id: u32,
    sz_csd_version: [u16; 128],
    w_service_pack_major: u16,
    w_service_pack_minor: u16,
    w_suite_mask: u16,
    w_product_type: u8,
    w_reserved: u8,
}

#[cfg(target_os = "windows")]
fn get_windows_build_number() -> u32 {
    unsafe {
        type RtlGetVersionFn = unsafe extern "system" fn(*mut OsVersionInfoExW) -> i32;
        let ntdll = windows_sys::Win32::System::LibraryLoader::GetModuleHandleA(b"ntdll.dll\0".as_ptr());
        if ntdll.is_null() {
            return 0;
        }
        let proc = windows_sys::Win32::System::LibraryLoader::GetProcAddress(ntdll, b"RtlGetVersion\0".as_ptr());
        if let Some(proc) = proc {
            let rtl_get_version: RtlGetVersionFn = std::mem::transmute(proc);
            let mut info = std::mem::zeroed::<OsVersionInfoExW>();
            info.dw_os_version_info_size = std::mem::size_of::<OsVersionInfoExW>() as u32;
            if rtl_get_version(&mut info) == 0 {
                return info.dw_build_number;
            }
        }
        0
    }
}

/// Applies native hardware-accelerated frosted glass backdrop.
/// Uses Windows 11 DWM System Backdrop (Acrylic / Mica) when available,
/// with graceful fallbacks for earlier Windows versions.
pub fn apply_frosted_glass(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        let build = get_windows_build_number();

        if let Ok(hwnd_raw) = window.hwnd() {
            let hwnd = hwnd_raw.0 as HWND;

            // Windows 11 22H2+ (Build >= 22621): Official DWM System Backdrop API
            if build >= 22621 {
                unsafe {
                    let dark: u32 = 1;
                    DwmSetWindowAttribute(
                        hwnd,
                        DWMWA_USE_IMMERSIVE_DARK_MODE,
                        &dark as *const _ as *const _,
                        std::mem::size_of::<u32>() as u32,
                    );

                    let backdrop: u32 = DWMSBT_TRANSIENTWINDOW;
                    let res = DwmSetWindowAttribute(
                        hwnd,
                        DWMWA_SYSTEMBACKDROP_TYPE,
                        &backdrop as *const _ as *const _,
                        std::mem::size_of::<u32>() as u32,
                    );

                    if res == 0 {
                        return;
                    }

                    // Fallback to Mica if TransientWindow failed
                    let mica: u32 = DWMSBT_MAINWINDOW;
                    if DwmSetWindowAttribute(
                        hwnd,
                        DWMWA_SYSTEMBACKDROP_TYPE,
                        &mica as *const _ as *const _,
                        std::mem::size_of::<u32>() as u32,
                    ) == 0
                    {
                        return;
                    }
                }
            } else if build >= 22000 {
                // Windows 11 21H2 (Build 22000): Early Mica API
                unsafe {
                    let dark: u32 = 1;
                    DwmSetWindowAttribute(
                        hwnd,
                        DWMWA_USE_IMMERSIVE_DARK_MODE,
                        &dark as *const _ as *const _,
                        std::mem::size_of::<u32>() as u32,
                    );

                    let mica_val: u32 = 1;
                    if DwmSetWindowAttribute(
                        hwnd,
                        DWMWA_MICA_EFFECT,
                        &mica_val as *const _ as *const _,
                        std::mem::size_of::<u32>() as u32,
                    ) == 0
                    {
                        return;
                    }
                }
            }
        }

        // Fallback for Windows 10 or environments where direct DWM attribute failed
        if let Err(_) = apply_acrylic(window, Some((18, 18, 22, 140))) {
            if let Err(_) = apply_mica(window, Some(true)) {
                let _ = apply_blur(window, Some((18, 18, 22, 140)));
            }
        }
    }
}

/// No-op placeholder to preserve compatibility with existing focus events if called.
pub fn refresh_vibrancy_on_focus(_window: &WebviewWindow, _focused: bool) {
    // Windows DWM handles active/inactive backdrop composition natively.
}
