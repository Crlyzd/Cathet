package com.cathet.app

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  companion object {
    init {
      System.loadLibrary("cathet")
    }
  }

  private external fun initNativeBridge(context: Context)

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    unlockMaxRefreshRate()
    initNativeBridge(applicationContext)
    handleIntent(intent)
    super.onCreate(savedInstanceState)
  }

  private fun unlockMaxRefreshRate() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val modes = display?.supportedModes
        val maxMode = modes?.maxByOrNull { it.refreshRate }
        if (maxMode != null) {
          val params = window.attributes
          params.preferredDisplayModeId = maxMode.modeId
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
