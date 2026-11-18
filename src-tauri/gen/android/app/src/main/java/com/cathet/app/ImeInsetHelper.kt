package com.cathet.app

import android.app.Activity
import android.view.ViewGroup
import android.webkit.WebView
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat

object ImeInsetHelper {
  fun attach(activity: Activity, webView: WebView) {
    var activeImeAnimations = 0
    var lastAppliedBottom = -1
    var lastDispatchedDp = -1
    var targetImeBottom = 0

    fun applyBottomMargin(imeBottom: Int) {
      val clamped = imeBottom.coerceAtLeast(0)
      if (clamped == lastAppliedBottom) return
      val lp = webView.layoutParams as? ViewGroup.MarginLayoutParams ?: return
      if (lp.bottomMargin != clamped) {
        lp.bottomMargin = clamped
        webView.layoutParams = lp
      }
      lastAppliedBottom = clamped
    }

    fun dispatchImeToJs(imeBottom: Int) {
      val density = webView.resources.displayMetrics.density.coerceAtLeast(1f)
      val imeDp = Math.round(imeBottom.coerceAtLeast(0) / density)
      if (imeDp == lastDispatchedDp) return
      lastDispatchedDp = imeDp
      webView.post {
        webView.evaluateJavascript(
          "window.__cathet_on_ime_inset&&window.__cathet_on_ime_inset($imeDp, true)",
          null
        )
      }
    }

    val decorView = activity.window?.decorView
    if (decorView != null) {
      ViewCompat.setWindowInsetsAnimationCallback(
        decorView,
        object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
          override fun onPrepare(animation: WindowInsetsAnimationCompat) {
            if ((animation.typeMask and WindowInsetsCompat.Type.ime()) != 0) {
              activeImeAnimations++
            }
          }

          override fun onStart(
            animation: WindowInsetsAnimationCompat,
            bounds: WindowInsetsAnimationCompat.BoundsCompat
          ): WindowInsetsAnimationCompat.BoundsCompat {
            if ((animation.typeMask and WindowInsetsCompat.Type.ime()) != 0) {
              dispatchImeToJs(targetImeBottom)
            }
            return bounds
          }

          override fun onProgress(
            insets: WindowInsetsCompat,
            runningAnimations: MutableList<WindowInsetsAnimationCompat>
          ): WindowInsetsCompat {
            val hasIme = runningAnimations.any {
              (it.typeMask and WindowInsetsCompat.Type.ime()) != 0
            }
            if (hasIme) {
              applyBottomMargin(insets.getInsets(WindowInsetsCompat.Type.ime()).bottom)
            }
            return insets
          }

          override fun onEnd(animation: WindowInsetsAnimationCompat) {
            if ((animation.typeMask and WindowInsetsCompat.Type.ime()) != 0) {
              activeImeAnimations = (activeImeAnimations - 1).coerceAtLeast(0)
              if (activeImeAnimations == 0) {
                val finalImeBottom = ViewCompat.getRootWindowInsets(webView)
                  ?.getInsets(WindowInsetsCompat.Type.ime())?.bottom
                  ?: targetImeBottom
                applyBottomMargin(finalImeBottom)
                dispatchImeToJs(finalImeBottom)
              }
            }
          }
        }
      )
    }

    ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
      val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
      targetImeBottom = imeBottom
      if (activeImeAnimations == 0) {
        applyBottomMargin(imeBottom)
        dispatchImeToJs(imeBottom)
      }

      val builder = WindowInsetsCompat.Builder(insets)
        .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)

      if (imeBottom > 0) {
        val nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
        builder.setInsets(
          WindowInsetsCompat.Type.navigationBars(),
          Insets.of(nav.left, nav.top, nav.right, 0)
        )
        val tap = insets.getInsets(WindowInsetsCompat.Type.tappableElement())
        builder.setInsets(
          WindowInsetsCompat.Type.tappableElement(),
          Insets.of(tap.left, tap.top, tap.right, 0)
        )
      }

      ViewCompat.onApplyWindowInsets(v, builder.build())
    }
  }
}
