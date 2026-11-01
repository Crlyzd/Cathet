import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.cathet.app"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.cathet.app"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        create("release") {
            val keyFile = file("cathet-release.jks")
            if (keyFile.exists()) {
                storeFile = keyFile
                storePassword = tauriProperties.getProperty("tauri.android.storePassword", "cathetpass")
                keyAlias = tauriProperties.getProperty("tauri.android.keyAlias", "cathet")
                keyPassword = tauriProperties.getProperty("tauri.android.keyPassword", "cathetpass")
            } else {
                val debugConfig = getByName("debug")
                storeFile = debugConfig.storeFile
                storePassword = debugConfig.storePassword
                keyAlias = debugConfig.keyAlias
                keyPassword = debugConfig.keyPassword
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")

fun applyRustWebViewPatch() {
    val file = file("src/main/java/com/cathet/app/generated/RustWebView.kt")
    if (!file.exists()) return
    var text = file.readText()
    if (text.contains("override fun onCreateInputConnection")) {
        val idx = text.indexOf("    override fun onCreateInputConnection")
        text = text.substring(0, idx) + "}\n"
    }
    if (!text.contains("onCreateInputConnection")) {
        val imports = """
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
"""
        if (!text.contains("EditorInfoCompat")) {
            text = text.replace("package com.cathet.app", "package com.cathet.app\n$imports")
        }

        val overrideMethod = """
    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
        val ic = super.onCreateInputConnection(outAttrs) ?: return null
        val mimeTypes = arrayOf(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/gif",
            "image/*"
        )
        EditorInfoCompat.setContentMimeTypes(outAttrs, mimeTypes)

        val callback = InputConnectionCompat.OnCommitContentListener { inputContentInfo, _, _ ->
            try {
                inputContentInfo.requestPermission()
            } catch (_: Exception) {}

            try {
                val uri = inputContentInfo.contentUri
                val bytes = try {
                    context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                } catch (_: Exception) {
                    null
                } ?: FileHelper.readUri(context, uri.toString())

                if (bytes != null && bytes.isNotEmpty()) {
                    val mime = inputContentInfo.description.getMimeType(0)
                        ?: context.contentResolver.getType(uri)
                        ?: "image/png"
                    FileHelper.setPendingCommitImage(mime, bytes)
                    val b64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                    post {
                        evaluateJavascript(
                            "if (window.__cathet_insert_committed_base64) { window.__cathet_insert_committed_base64('${'$'}mime', '${'$'}b64'); } else if (window.__cathet_on_commit_image_ready) { window.__cathet_on_commit_image_ready(); }",
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
            }
        }

        return InputConnectionCompat.createWrapper(ic, outAttrs, callback)
    }
}
"""
        val lastBrace = text.lastIndexOf('}')
        if (lastBrace != -1) {
            text = text.substring(0, lastBrace) + overrideMethod
        }
        file.writeText(text)
        println("[Cathet] Patched RustWebView.kt with Commit Content API override.")
    }
}

val patchRustWebView = tasks.register("patchRustWebView") {
    doLast {
        applyRustWebViewPatch()
    }
}

afterEvaluate {
    val rustTasks = tasks.matching { it.name.startsWith("rustBuild") }
    rustTasks.configureEach {
        doLast {
            applyRustWebViewPatch()
        }
    }
    tasks.matching { it.name.startsWith("compile") && it.name.contains("Kotlin") }.configureEach {
        mustRunAfter(rustTasks)
        doFirst {
            applyRustWebViewPatch()
        }
    }
}
