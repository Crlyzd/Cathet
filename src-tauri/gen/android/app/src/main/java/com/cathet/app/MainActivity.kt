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

    private var activeInstance: MainActivity? = null

    @JvmStatic
    fun setRefreshRateHz(targetHz: Int) {
      activeInstance?.runOnUiThread {
        activeInstance?.applyRefreshRate(targetHz)
      }
    }
  }

  private external fun initNativeBridge(context: Context)

  override fun onCreate(savedInstanceState: Bundle?) {
    activeInstance = this
    enableEdgeToEdge()
    applyRefreshRate(120)
    initNativeBridge(applicationContext)
    handleIntent(intent)
    super.onCreate(savedInstanceState)
  }

  override fun onDestroy() {
    if (activeInstance == this) {
      activeInstance = null
    }
    super.onDestroy()
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
