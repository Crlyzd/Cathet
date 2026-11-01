package com.cathet.app

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns

object FileHelper {
    private var initialUri: String? = null
    private var pendingCommitMime: String? = null
    private var pendingCommitBytes: ByteArray? = null

    @JvmStatic
    fun setInitialUri(uri: String?) {
        initialUri = uri
    }

    @JvmStatic
    fun getInitialUri(): String? {
        val uri = initialUri
        initialUri = null
        return uri
    }

    @JvmStatic
    @Synchronized
    fun setPendingCommitImage(mime: String?, bytes: ByteArray?) {
        pendingCommitMime = mime
        pendingCommitBytes = bytes
    }

    @JvmStatic
    @Synchronized
    fun getPendingCommitMime(): String? {
        return pendingCommitMime
    }

    @JvmStatic
    @Synchronized
    fun getPendingCommitBytes(): ByteArray? {
        val bytes = pendingCommitBytes
        pendingCommitBytes = null
        pendingCommitMime = null
        return bytes
    }

    @JvmStatic
    @Synchronized
    fun clearPendingCommitImage() {
        pendingCommitMime = null
        pendingCommitBytes = null
    }

    @JvmStatic
    fun readUri(context: Context, uriString: String): ByteArray? {
        return try {
            val uri = Uri.parse(uriString)
            context.contentResolver.openInputStream(uri)?.use { stream ->
                stream.readBytes()
            } ?: run {
                val path = if (uri.scheme == "file") uri.path else uriString
                if (!path.isNullOrEmpty()) java.io.File(path).readBytes() else null
            }
        } catch (e: Exception) {
            try {
                val uri = Uri.parse(uriString)
                val path = if (uri.scheme == "file") uri.path else uriString
                if (!path.isNullOrEmpty()) java.io.File(path).readBytes() else null
            } catch (_: Exception) {
                e.printStackTrace()
                null
            }
        }
    }

    @JvmStatic
    fun writeUri(context: Context, uriString: String, bytes: ByteArray): Boolean {
        return try {
            val uri = Uri.parse(uriString)
            context.contentResolver.openOutputStream(uri, "wt")?.use { stream ->
                stream.write(bytes)
                stream.flush()
                true
            } ?: false
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JvmStatic
    fun getDisplayName(context: Context, uriString: String): String {
        return try {
            val uri = Uri.parse(uriString)
            var name: String? = null
            if (uri.scheme == "content") {
                context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (idx >= 0) {
                            name = cursor.getString(idx)
                        }
                    }
                }
            }
            val fallback = Uri.decode(uri.lastPathSegment ?: uriString)
                .substringAfterLast('/')
                .substringAfterLast(':')
                .trim()
            if (!name.isNullOrEmpty()) name!! else if (fallback.isNotEmpty()) fallback else "document.md"
        } catch (e: Exception) {
            "document.md"
        }
    }

    @JvmStatic
    fun getClipboardImageMime(context: Context): String? {
        val pendingMime = pendingCommitMime
        if (!pendingMime.isNullOrEmpty()) {
            return pendingMime
        }
        return try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                ?: return null
            val clip = clipboard.primaryClip ?: return null
            if (clip.itemCount == 0) return null

            val item = clip.getItemAt(0)
            val uri = item.uri
            if (uri != null) {
                val mime = context.contentResolver.getType(uri)
                if (mime != null && mime.startsWith("image/")) return mime
            }

            for (i in 0 until clip.description.mimeTypeCount) {
                val m = clip.description.getMimeType(i)
                if (m.startsWith("image/")) return m
            }

            if (uri != null) {
                val path = uri.path ?: uri.toString()
                val ext = path.substringAfterLast('.', "").lowercase()
                if (ext in listOf("png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif")) {
                    return if (ext == "jpg") "image/jpeg" else "image/$ext"
                }
            }
            null
        } catch (_: Exception) {
            null
        }
    }

    @JvmStatic
    fun getClipboardImageBytes(context: Context): ByteArray? {
        val pendingBytes = pendingCommitBytes
        if (pendingBytes != null && pendingBytes.isNotEmpty()) {
            pendingCommitBytes = null
            pendingCommitMime = null
            return pendingBytes
        }
        return try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                ?: return null
            val clip = clipboard.primaryClip ?: return null
            if (clip.itemCount == 0) return null

            val item = clip.getItemAt(0)
            val uri = item.uri ?: return null
            readUri(context, uri.toString())
        } catch (_: Exception) {
            null
        }
    }
}
