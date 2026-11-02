//! Biometric authentication bridge for Android.
//! Invokes Android BiometricPrompt (fingerprint & lock screen PIN) and awaits response via JNI.

#[cfg(target_os = "android")]
use jni::objects::{JClass, JString, JValue};
#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use std::sync::Mutex;
#[cfg(target_os = "android")]
use tokio::sync::oneshot;

#[cfg(target_os = "android")]
static BIOMETRIC_SENDER: Mutex<Option<oneshot::Sender<Result<bool, String>>>> = Mutex::new(None);

#[cfg(target_os = "android")]
#[no_mangle]
pub extern "C" fn Java_com_cathet_app_MainActivity_onBiometricResult(
    mut env: JNIEnv,
    _class: JClass,
    success: bool,
    error: jni::objects::JObject,
) {
    let err_str: Option<String> = if !error.is_null() {
        let jstr = JString::from(error);
        env.get_string(&jstr).ok().map(|s| s.into())
    } else {
        None
    };

    if let Ok(mut lock) = BIOMETRIC_SENDER.lock() {
        if let Some(tx) = lock.take() {
            if success {
                let _ = tx.send(Ok(true));
            } else {
                let msg = err_str.unwrap_or_else(|| "Biometric authentication failed".to_string());
                let _ = tx.send(Err(msg));
            }
        }
    }
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn authenticate_biometric(
    title: Option<String>,
    subtitle: Option<String>,
) -> Result<bool, String> {
    let (tx, rx) = oneshot::channel();
    {
        let mut lock = BIOMETRIC_SENDER.lock().map_err(|e| e.to_string())?;
        *lock = Some(tx);
    }

    let t = title.unwrap_or_else(|| "Unlock Private Notes".to_string());
    let s = subtitle.unwrap_or_else(|| "Confirm fingerprint or device PIN".to_string());

    let jni_res = crate::commands::android_fs::with_jni_context(|env, _ctx, helper_cls| {
        let j_title = env.new_string(&t).map_err(|e| e.to_string())?;
        let j_subtitle = env.new_string(&s).map_err(|e| e.to_string())?;
        env.call_static_method(
            helper_cls,
            "authenticateBiometrics",
            "(Ljava/lang/String;Ljava/lang/String;)V",
            &[JValue::Object(&j_title), JValue::Object(&j_subtitle)],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    });

    if let Err(e) = jni_res {
        if let Ok(mut lock) = BIOMETRIC_SENDER.lock() {
            let _ = lock.take();
        }
        return Err(e);
    }

    rx.await.map_err(|_| "Biometric prompt cancelled".to_string())?
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn authenticate_biometric(
    _title: Option<String>,
    _subtitle: Option<String>,
) -> Result<bool, String> {
    // Non-Android fallback (e.g. desktop dev simulation)
    Ok(true)
}
