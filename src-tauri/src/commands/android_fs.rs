//! Android ContentResolver & SAF (Storage Access Framework) JNI Bridge.
//! Provides streaming read, write, and display name resolution for content:// URIs.

#[cfg(target_os = "android")]
use jni::objects::{GlobalRef, JByteArray, JClass, JObject, JString, JValue};
#[cfg(target_os = "android")]
use jni::{JNIEnv, JavaVM};
#[cfg(target_os = "android")]
use std::sync::OnceLock;

#[cfg(target_os = "android")]
static JVM: OnceLock<JavaVM> = OnceLock::new();
#[cfg(target_os = "android")]
static APP_CONTEXT: OnceLock<GlobalRef> = OnceLock::new();
#[cfg(target_os = "android")]
static FILE_HELPER_CLASS: OnceLock<GlobalRef> = OnceLock::new();

#[cfg(target_os = "android")]
#[no_mangle]
pub extern "C" fn Java_com_cathet_app_MainActivity_initNativeBridge(
    mut env: JNIEnv,
    _class: JClass,
    context: JObject,
) {
    if let Ok(vm) = env.get_java_vm() {
        let vm_ptr = vm.get_java_vm_pointer() as *mut std::ffi::c_void;
        let _ = JVM.set(vm);
        if let Ok(global_ref) = env.new_global_ref(&context) {
            let ctx_ptr = global_ref.as_obj().as_raw() as *mut std::ffi::c_void;
            let _ = APP_CONTEXT.set(global_ref);
            unsafe {
                ndk_context::initialize_android_context(vm_ptr, ctx_ptr);
            }
        }
    }
    if let Ok(helper_cls) = env.find_class("com/cathet/app/FileHelper") {
        if let Ok(global_cls) = env.new_global_ref(helper_cls) {
            let _ = FILE_HELPER_CLASS.set(global_cls);
        }
    }
}

#[cfg(target_os = "android")]
fn with_jni_context<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce(&mut jni::JNIEnv, &JObject, &JClass) -> Result<T, String>,
{
    let vm = JVM.get().ok_or_else(|| "Android JavaVM not initialized".to_string())?;
    let context_ref = APP_CONTEXT.get().ok_or_else(|| "Android Context not initialized".to_string())?;
    let helper_cls_ref = FILE_HELPER_CLASS.get().ok_or_else(|| "FileHelper class not initialized".to_string())?;
    let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
    let helper_jclass = unsafe { JClass::from_raw(helper_cls_ref.as_obj().as_raw()) };
    let res = f(&mut env, context_ref.as_obj(), &helper_jclass);
    if env.exception_check().unwrap_or(false) {
        let _ = env.exception_clear();
    }
    res
}

#[cfg(target_os = "android")]
pub fn read_content_uri(uri: &str) -> Result<(String, Vec<u8>), String> {
    with_jni_context(|env, context, helper_cls| {
        let uri_jstr = env.new_string(uri).map_err(|e| e.to_string())?;
        let name_res = env.call_static_method(
            helper_cls,
            "getDisplayName",
            "(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;",
            &[JValue::from(context), JValue::from(&uri_jstr)],
        ).map_err(|e| e.to_string())?;

        let name_obj = name_res.l().map_err(|e| e.to_string())?;
        let name_jstr: JString = name_obj.into();
        let display_name: String = env.get_string(&name_jstr).map_err(|e| e.to_string())?.into();

        let bytes_res = env.call_static_method(
            helper_cls,
            "readUri",
            "(Landroid/content/Context;Ljava/lang/String;)[B",
            &[JValue::from(context), JValue::from(&uri_jstr)],
        ).map_err(|e| e.to_string())?;

        let bytes_obj = bytes_res.l().map_err(|e| e.to_string())?;
        if bytes_obj.is_null() {
            return Err("Unable to read content URI: stream was null or inaccessible".to_string());
        }

        let byte_array: JByteArray = bytes_obj.into();
        let bytes: Vec<u8> = env.convert_byte_array(&byte_array).map_err(|e| e.to_string())?;
        Ok((display_name, bytes))
    })
}

#[cfg(target_os = "android")]
pub fn write_content_uri(uri: &str, content: &[u8]) -> Result<(), String> {
    with_jni_context(|env, context, helper_cls| {
        let uri_jstr = env.new_string(uri).map_err(|e| e.to_string())?;
        let byte_array = env.byte_array_from_slice(content).map_err(|e| e.to_string())?;

        let res = env.call_static_method(
            helper_cls,
            "writeUri",
            "(Landroid/content/Context;Ljava/lang/String;[B)Z",
            &[JValue::from(context), JValue::from(&uri_jstr), JValue::from(&byte_array)],
        ).map_err(|e| e.to_string())?;

        if res.z().unwrap_or(false) {
            Ok(())
        } else {
            Err("Failed to write to content URI".to_string())
        }
    })
}

#[cfg(target_os = "android")]
pub fn get_android_initial_uri() -> Option<String> {
    with_jni_context(|env, _context, helper_cls| {
        let res = env.call_static_method(
            helper_cls,
            "getInitialUri",
            "()Ljava/lang/String;",
            &[],
        ).map_err(|e| e.to_string())?;

        let obj = res.l().map_err(|e| e.to_string())?;
        if obj.is_null() {
            return Ok(None);
        }
        let jstr: JString = obj.into();
        let s: String = env.get_string(&jstr).map_err(|e| e.to_string())?.into();
        Ok(Some(s))
    }).unwrap_or(None)
}

#[cfg(target_os = "android")]
pub fn read_android_clipboard_image() -> Result<Option<(String, Vec<u8>)>, String> {
    with_jni_context(|env, context, helper_cls| {
        let mime_res = env.call_static_method(
            helper_cls,
            "getClipboardImageMime",
            "(Landroid/content/Context;)Ljava/lang/String;",
            &[JValue::from(context)],
        ).map_err(|e| e.to_string())?;

        let mime_obj = mime_res.l().map_err(|e| e.to_string())?;
        if mime_obj.is_null() {
            return Ok(None);
        }
        let mime_jstr: JString = mime_obj.into();
        let mime: String = env.get_string(&mime_jstr).map_err(|e| e.to_string())?.into();

        let bytes_res = env.call_static_method(
            helper_cls,
            "getClipboardImageBytes",
            "(Landroid/content/Context;)[B",
            &[JValue::from(context)],
        ).map_err(|e| e.to_string())?;

        let bytes_obj = bytes_res.l().map_err(|e| e.to_string())?;
        if bytes_obj.is_null() {
            return Ok(None);
        }
        let byte_array: JByteArray = bytes_obj.into();
        let bytes: Vec<u8> = env.convert_byte_array(&byte_array).map_err(|e| e.to_string())?;
        Ok(Some((mime, bytes)))
    })
}

#[cfg(target_os = "android")]
pub fn read_android_pending_commit_image() -> Result<Option<(String, Vec<u8>)>, String> {
    with_jni_context(|env, _context, helper_cls| {
        let mime_res = env.call_static_method(
            helper_cls,
            "getPendingCommitMime",
            "()Ljava/lang/String;",
            &[],
        ).map_err(|e| e.to_string())?;

        let mime_obj = mime_res.l().map_err(|e| e.to_string())?;
        if mime_obj.is_null() {
            return Ok(None);
        }
        let mime_jstr: JString = mime_obj.into();
        let mime: String = env.get_string(&mime_jstr).map_err(|e| e.to_string())?.into();

        let bytes_res = env.call_static_method(
            helper_cls,
            "getPendingCommitBytes",
            "()[B",
            &[],
        ).map_err(|e| e.to_string())?;

        let bytes_obj = bytes_res.l().map_err(|e| e.to_string())?;
        if bytes_obj.is_null() {
            return Ok(None);
        }
        let byte_array: JByteArray = bytes_obj.into();
        let bytes: Vec<u8> = env.convert_byte_array(&byte_array).map_err(|e| e.to_string())?;
        Ok(Some((mime, bytes)))
    })
}

#[cfg(not(target_os = "android"))]
pub fn read_content_uri(_uri: &str) -> Result<(String, Vec<u8>), String> {
    Err("Content URIs are only supported on Android".to_string())
}

#[cfg(not(target_os = "android"))]
pub fn write_content_uri(_uri: &str, _content: &[u8]) -> Result<(), String> {
    Err("Content URIs are only supported on Android".to_string())
}

#[cfg(not(target_os = "android"))]
pub fn get_android_initial_uri() -> Option<String> {
    None
}

#[cfg(not(target_os = "android"))]
pub fn read_android_clipboard_image() -> Result<Option<(String, Vec<u8>)>, String> {
    Ok(None)
}

#[cfg(not(target_os = "android"))]
pub fn read_android_pending_commit_image() -> Result<Option<(String, Vec<u8>)>, String> {
    Ok(None)
}

#[cfg(target_os = "android")]
pub fn set_android_refresh_rate(hz: i32) -> Result<(), String> {
    with_jni_context(|env, _ctx, helper_cls| {
        env.call_static_method(
            helper_cls,
            "setRefreshRate",
            "(I)V",
            &[JValue::Int(hz)],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[cfg(not(target_os = "android"))]
pub fn set_android_refresh_rate(_hz: i32) -> Result<(), String> {
    Ok(())
}
