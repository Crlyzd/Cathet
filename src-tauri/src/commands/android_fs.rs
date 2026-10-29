//! Android ContentResolver & SAF (Storage Access Framework) JNI Bridge.
//! Provides streaming read, write, and display name resolution for content:// URIs.

#[cfg(target_os = "android")]
use jni::objects::{JByteArray, JObject, JString, JValue};
#[cfg(target_os = "android")]
use jni::JavaVM;

#[cfg(target_os = "android")]
fn with_jni_context<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce(&mut jni::JNIEnv, &JObject) -> Result<T, String>,
{
    let ctx = ndk_context::android_context();
    let vm = unsafe { JavaVM::from_raw(ctx.vm().cast()) }.map_err(|e| e.to_string())?;
    let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
    let context = unsafe { JObject::from_raw(ctx.context().cast()) };
    f(&mut env, &context)
}

#[cfg(target_os = "android")]
pub fn read_content_uri(uri: &str) -> Result<(String, Vec<u8>), String> {
    with_jni_context(|env, context| {
        let uri_jstr = env.new_string(uri).map_err(|e| e.to_string())?;
        let name_res = env.call_static_method(
            "com/cathet/app/FileHelper",
            "getDisplayName",
            "(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;",
            &[JValue::from(context), JValue::from(&uri_jstr)],
        ).map_err(|e| e.to_string())?;

        let name_obj = name_res.l().map_err(|e| e.to_string())?;
        let name_jstr: JString = name_obj.into();
        let display_name: String = env.get_string(&name_jstr).map_err(|e| e.to_string())?.into();

        let bytes_res = env.call_static_method(
            "com/cathet/app/FileHelper",
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
    with_jni_context(|env, context| {
        let uri_jstr = env.new_string(uri).map_err(|e| e.to_string())?;
        let byte_array = env.byte_array_from_slice(content).map_err(|e| e.to_string())?;

        let res = env.call_static_method(
            "com/cathet/app/FileHelper",
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
    with_jni_context(|env, _context| {
        let res = env.call_static_method(
            "com/cathet/app/FileHelper",
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
