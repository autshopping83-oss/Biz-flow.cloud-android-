package com.bizflow.cloud.features.documentviewer

import android.content.Context
import android.net.Uri
import android.webkit.MimeTypeMap

enum class DocumentType(val label: String) {
    PDF("PDF"),
    DOCX("DOCX"),
    XLSX("XLSX"),
    CSV("CSV"),
    UNKNOWN("Unknown");

    val viewerHtml: String
        get() = when (this) {
            PDF -> "pdf_viewer.html"
            DOCX -> "docx_viewer.html"
            XLSX, CSV -> "xlsx_viewer.html"
            UNKNOWN -> ""
        }

    val jsEntryPoint: String
        get() = when (this) {
            PDF -> "loadPdfFromBase64"
            DOCX -> "loadDocxFromBase64"
            XLSX -> "loadXlsxFromBase64"
            CSV -> "loadCsvFromBase64"
            UNKNOWN -> ""
        }
}

object FileDetector {

    private val MAGIC_BYTES = mapOf(
        DocumentType.PDF to byteArrayOf(0x25, 0x50, 0x44, 0x46), // %PDF
        DocumentType.XLSX to byteArrayOf(0x50, 0x4B, 0x03, 0x04), // PK (ZIP)
    )

    private val MIME_MAP = mapOf(
        "application/pdf" to DocumentType.PDF,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" to DocumentType.DOCX,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" to DocumentType.XLSX,
        "text/csv" to DocumentType.CSV,
        "text/comma-separated-values" to DocumentType.CSV,
        "application/csv" to DocumentType.CSV,
    )

    private val EXTENSION_MAP = mapOf(
        "pdf" to DocumentType.PDF,
        "docx" to DocumentType.DOCX,
        "xlsx" to DocumentType.XLSX,
        "csv" to DocumentType.CSV,
        "ods" to DocumentType.XLSX,
    )

    fun detect(context: Context, uri: Uri, intentMimeType: String?): DocumentType {
        // 1. Try MIME from intent
        if (!intentMimeType.isNullOrBlank()) {
            MIME_MAP[intentMimeType]?.let { return it }
        }

        // 2. Try extension from URI
        val extension = getExtension(context, uri)
        if (!extension.isNullOrBlank()) {
            EXTENSION_MAP[extension.lowercase()]?.let { return it }
        }

        // 3. Try MIME from ContentResolver
        val resolverMime = context.contentResolver.getType(uri)
        if (!resolverMime.isNullOrBlank()) {
            MIME_MAP[resolverMime]?.let { return it }
        }

        // 4. Try magic bytes
        try {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                val header = ByteArray(4)
                val bytesRead = stream.read(header)
                if (bytesRead >= 4) {
                    for ((type, magic) in MAGIC_BYTES) {
                        if (header.startsWith(magic)) return type
                    }
                }
            }
        } catch (_: Exception) { }

        return DocumentType.UNKNOWN
    }

    private fun getExtension(context: Context, uri: Uri): String? {
        val path = uri.lastPathSegment ?: return null
        val dot = path.lastIndexOf('.')
        return if (dot >= 0) path.substring(dot + 1) else null
    }
}
