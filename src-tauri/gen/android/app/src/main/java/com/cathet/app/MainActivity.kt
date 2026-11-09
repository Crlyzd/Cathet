package com.cathet.app

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  companion object {
    init {
      System.loadLibrary("cathet")
    }

    private var activeInstance: MainActivity? = null

    @JvmStatic
    fun setRefreshRateHz(targetHz: Int) {
      activeInstance?.runOnUiThread {
        activeInstance?.applyRefreshRate(targetHz)
      }
    }

    @JvmStatic
    fun authenticateBiometrics(title: String, subtitle: String) {
      activeInstance?.runOnUiThread {
        activeInstance?.startBiometricAuth(title, subtitle)
      }
    }
  }

  private external fun initNativeBridge(context: Context)
  private external fun onBiometricResult(success: Boolean, error: String?)

  override fun onCreate(savedInstanceState: Bundle?) {
    activeInstance = this
    enableEdgeToEdge()
    applyRefreshRate(120)
    initNativeBridge(applicationContext)
    handleIntent(intent)
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webView.addJavascriptInterface(object {
      @android.webkit.JavascriptInterface
      fun performHaptic(type: String) {
        activeInstance?.runOnUiThread {
          val v = webView
          when (type) {
            "tick" -> {
              v.performHapticFeedback(android.view.HapticFeedbackConstants.CLOCK_TICK, android.view.HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING)
            }
            "unlock" -> {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                v.performHapticFeedback(android.view.HapticFeedbackConstants.CONFIRM, android.view.HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING)
              } else {
                v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS)
              }
            }
            else -> v.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
          }
        }
      }
    }, "CathetNativeHaptic")
    ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
      val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
      val density = resources.displayMetrics.density.coerceAtLeast(1f)
      val imeDp = Math.round(imeBottom / density)
      webView.post {
        webView.evaluateJavascript("window.__cathet_on_ime_inset&&window.__cathet_on_ime_inset($imeDp)", null)
      }
      ViewCompat.onApplyWindowInsets(v, insets)
    }
  }

  override fun onDestroy() {
    if (activeInstance == this) {
      activeInstance = null
    }
    super.onDestroy()
  }

  private fun startBiometricAuth(title: String, subtitle: String) {
    try {
      val executor = ContextCompat.getMainExecutor(this)
      val prompt = BiometricPrompt(this, executor, object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
          super.onAuthenticationSucceeded(result)
          onBiometricResult(true, null)
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
          super.onAuthenticationError(errorCode, errString)
          onBiometricResult(false, errString.toString())
        }

        override fun onAuthenticationFailed() {
          super.onAuthenticationFailed()
        }
      })

      val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle(title)
        .setSubtitle(subtitle)
        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
        .build()

      prompt.authenticate(promptInfo)
    } catch (e: Exception) {
      onBiometricResult(false, e.message ?: "Authentication failed")
    }
  }

  private fun applyRefreshRate(targetHz: Int) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val modes = display?.supportedModes
        val chosenMode = if (targetHz <= 60) {
          modes?.find { Math.round(it.refreshRate) == 60 } ?: modes?.minByOrNull { it.refreshRate }
        } else {
          modes?.maxByOrNull { it.refreshRate }
        }
        if (chosenMode != null) {
          val params = window.attributes
          params.preferredDisplayModeId = chosenMode.modeId
          window.attributes = params
        }
      } catch (_: Exception) {}
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    handleIntent(intent)
  }

  private fun handleIntent(intent: Intent?) {
    if (intent != null && intent.action == Intent.ACTION_VIEW) {
      val uri = intent.dataString
      if (!uri.isNullOrEmpty()) {
        FileHelper.setInitialUri(uri)
      }
    }
  }
}
