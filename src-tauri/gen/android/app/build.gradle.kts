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

val patchRustWebView = tasks.register("patchRustWebView") {
    doLast {
        val file = file("src/main/java/com/cathet/app/generated/RustWebView.kt")
        if (file.exists()) {
            var text = file.readText()
            if (!text.contains("onCreateInputConnection")) {
                val imports = """
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
"""
                text = text.replace("package com.cathet.app\n", "package com.cathet.app\n$imports\n")

                val overrideMethod = """
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
"""
                text = text.replace(Regex("\\}\\s*$"), "$overrideMethod")
                file.writeText(text)
                println("[Cathet] Successfully patched RustWebView.kt with Commit Content API override.")
            }
        }
    }
}

tasks.named("preBuild") {
    dependsOn(patchRustWebView)
}

tasks.matching { it.name.startsWith("compile") && it.name.contains("Kotlin") }.configureEach {
    dependsOn(patchRustWebView)
}
