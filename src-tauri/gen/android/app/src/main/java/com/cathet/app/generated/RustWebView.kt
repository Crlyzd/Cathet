/* THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!! */

// Copyright 2020-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

@file:Suppress("unused", "SetJavaScriptEnabled")

package com.cathet.app

import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat


import android.annotation.SuppressLint
import android.webkit.*
import android.content.Context
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlin.collections.Map

@SuppressLint("RestrictedApi")
class RustWebView(context: Context, val initScripts: Array<String>, val id: String): WebView(context) {
    val isDocumentStartScriptEnabled: Boolean

    init {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.setGeolocationEnabled(true)
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.javaScriptCanOpenWindowsAutomatically = true

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            isDocumentStartScriptEnabled = true
            for (script in initScripts) {
                WebViewCompat.addDocumentStartJavaScript(this, script, setOf("*"));
            }
        } else {
          isDocumentStartScriptEnabled = false
        }

        
    }

    fun loadUrlMainThread(url: String) {
        post {
          loadUrl(url)
        }
    }

    fun loadUrlMainThread(url: String, additionalHttpHeaders: Map<String, String>) {
        post {
          loadUrl(url, additionalHttpHeaders)
        }
    }

    override fun loadUrl(url: String) {
        if (!Rust.shouldOverride(id, url)) {
            super.loadUrl(url);
        }
    }

    override fun loadUrl(url: String, additionalHttpHeaders: Map<String, String>) {
        if (!Rust.shouldOverride(id, url)) {
            super.loadUrl(url, additionalHttpHeaders);
        }
    }

    fun loadHTMLMainThread(html: String) {
        post {
          super.loadData(html, "text/html", null)
        }
    }

    fun evalScript(id: Int, script: String) {
        post {
            super.evaluateJavascript(script) { result ->
                Rust.onEval(this.id, id, result)
            }
        }
    }

    fun clearAllBrowsingData() {
        try {
            super.getContext().deleteDatabase("webviewCache.db")
            super.getContext().deleteDatabase("webview.db")
            super.clearCache(true)
            super.clearHistory()
            super.clearFormData()
        } catch (ex: Exception) {
            Logger.error("Unable to create temporary media capture file: " + ex.message)
        }
    }

    fun getCookies(url: String): String {
        val cookieManager = CookieManager.getInstance()
        return cookieManager.getCookie(url)
    }

    

    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
        val ic = super.onCreateInputConnection(outAttrs) ?: return null
        val mimeTypes = arrayOf(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/gif"
        )
        EditorInfoCompat.setContentMimeTypes(outAttrs, mimeTypes)

        val callback = InputConnectionCompat.OnCommitContentListener { inputContentInfo, flags, _ ->
            val hasPermission = (flags and InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION) != 0
            if (hasPermission) {
                try {
                    inputContentInfo.requestPermission()
                } catch (e: Exception) {
                    return@OnCommitContentListener false
                }
            }

            try {
                val uri = inputContentInfo.contentUri
                val bytes = FileHelper.readUri(context, uri.toString())
                if (bytes != null && bytes.isNotEmpty()) {
                    val mime = inputContentInfo.description?.getMimeType(0)
                        ?: context.contentResolver.getType(uri)
                        ?: "image/png"
                    FileHelper.setPendingCommitImage(mime, bytes)
                    post {
                        evaluateJavascript(
                            "window.__cathet_on_commit_image_ready && window.__cathet_on_commit_image_ready();",
                            null
                        )
                    }
                    true
                } else {
                    false
                }
            } catch (e: Exception) {
                e.printStackTrace()
                false
            } finally {
                if (hasPermission) {
                    try {
                        inputContentInfo.releasePermission()
                    } catch (_: Exception) {}
                }
            }
        }

        return InputConnectionCompat.createWrapper(ic, outAttrs, callback)
    }
}
