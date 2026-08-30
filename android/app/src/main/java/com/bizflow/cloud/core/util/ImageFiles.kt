package com.bizflow.cloud.core.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import java.io.File
import java.io.FileOutputStream

object ImageFiles {
    fun savePngFromUri(context: Context, uri: Uri, dirName: String, fileName: String): String? {
        return try {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
            savePngBytes(context, bytes, dirName, fileName)
        } catch (_: Exception) {
            null
        }
    }

    fun savePng(context: Context, bitmap: Bitmap, dirName: String, fileName: String): String? {
        return try {
            val directory = File(context.filesDir, dirName)
            if (!directory.exists()) directory.mkdirs()
            val file = File(directory, fileName)
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            file.absolutePath
        } catch (_: Exception) {
            null
        }
    }

    fun signaturePath(context: Context, documentId: String): String {
        val directory = File(context.filesDir, "documents")
        if (!directory.exists()) directory.mkdirs()
        return File(directory, "sig_$documentId.png").absolutePath
    }

    fun saveSignaturePng(context: Context, documentId: String, bytes: ByteArray): String? {
        val path = signaturePath(context, documentId)
        return try {
            FileOutputStream(File(path)).use { it.write(bytes) }
            path
        } catch (_: Exception) {
            null
        }
    }

    fun toDataUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        return try {
            val bytes = File(path).readBytes()
            toDataUrl(bytes)
        } catch (_: Exception) {
            null
        }
    }

    fun toDataUrl(bytes: ByteArray): String =
        "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)

    private fun savePngBytes(context: Context, bytes: ByteArray, dirName: String, fileName: String): String? {
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
        return savePng(context, bitmap, dirName, fileName)
    }
}