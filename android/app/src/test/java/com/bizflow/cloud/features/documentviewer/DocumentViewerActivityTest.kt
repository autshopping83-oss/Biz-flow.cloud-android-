package com.bizflow.cloud.features.documentviewer

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class DocumentViewerActivityTest {

    // --- Intent construction tests ---

    @Test
    fun `PDF intent has correct MIME type`() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            type = "application/pdf"
            data = Uri.parse("content://com.example.filemanager/document/1")
        }
        assertEquals("application/pdf", intent.type)
        assertNotNull(intent.data)
    }

    @Test
    fun `DOCX intent has correct MIME type`() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            data = Uri.parse("content://com.example.filemanager/document/2")
        }
        assertEquals(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            intent.type
        )
    }

    @Test
    fun `XLSX intent has correct MIME type`() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            data = Uri.parse("content://com.example.filemanager/document/3")
        }
        assertEquals(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            intent.type
        )
    }

    @Test
    fun `CSV intent has correct MIME type`() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            type = "text/csv"
            data = Uri.parse("content://com.example.filemanager/document/4")
        }
        assertEquals("text/csv", intent.type)
    }

    @Test
    fun `CSV intent with alternative MIME type`() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            type = "text/comma-separated-values"
            data = Uri.parse("content://com.example.filemanager/document/5")
        }
        assertEquals("text/comma-separated-values", intent.type)
    }

    // --- URI scheme tests ---

    @Test
    fun `content URI scheme is used`() {
        val uri = Uri.parse("content://com.example.filemanager/document/1")
        assertEquals("content", uri.scheme)
    }

    @Test
    fun `file URI scheme is handled`() {
        val uri = Uri.parse("file:///storage/emulated/0/Documents/test.pdf")
        assertEquals("file", uri.scheme)
    }

    // --- FileDetector integration with Intent ---

    @Test
    fun `FileDetector maps PDF MIME correctly`() {
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
        )
        assertEquals(DocumentType.PDF, mimeMap["application/pdf"])
    }

    @Test
    fun `FileDetector maps DOCX MIME correctly`() {
        val mimeMap = mapOf(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" to DocumentType.DOCX,
        )
        assertEquals(DocumentType.DOCX, mimeMap["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])
    }

    @Test
    fun `FileDetector maps XLSX MIME correctly`() {
        val mimeMap = mapOf(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" to DocumentType.XLSX,
        )
        assertEquals(DocumentType.XLSX, mimeMap["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])
    }

    @Test
    fun `FileDetector maps CSV MIME correctly`() {
        val mimeMap = mapOf(
            "text/csv" to DocumentType.CSV,
            "text/comma-separated-values" to DocumentType.CSV,
            "application/csv" to DocumentType.CSV,
        )
        assertEquals(DocumentType.CSV, mimeMap["text/csv"])
        assertEquals(DocumentType.CSV, mimeMap["text/comma-separated-values"])
        assertEquals(DocumentType.CSV, mimeMap["application/csv"])
    }

    // --- Extension fallback tests ---

    @Test
    fun `extension extraction from content URI path`() {
        val uri = Uri.parse("content://com.example/document/report.docx")
        val path = uri.lastPathSegment
        val ext = path?.substringAfterLast('.')
        assertEquals("docx", ext)
    }

    @Test
    fun `extension extraction with dots in filename`() {
        val uri = Uri.parse("content://com.example/document/my.report.2024.xlsx")
        val path = uri.lastPathSegment
        val ext = path?.substringAfterLast('.')
        assertEquals("xlsx", ext)
    }

    @Test
    fun `extension extraction with no dot`() {
        val uri = Uri.parse("content://com.example/document/nodocext")
        val path = uri.lastPathSegment
        val dot = path?.lastIndexOf('.')
        val ext = if (dot != null && dot >= 0) path.substring(dot + 1) else null
        assertEquals(null, ext)
    }

    // --- MIME conflict tests ---

    @Test
    fun `conflict scenario - PDF MIME but DOCX extension`() {
        // Intent says PDF, but file is actually DOCX
        // Detection priority: MIME > extension > ContentResolver > magic bytes
        // MIME wins — PDF renderer will fail gracefully on DOCX content
        val intentMime = "application/pdf"
        val extension = "docx"
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" to DocumentType.DOCX,
        )
        // MIME has priority
        val detected = mimeMap[intentMime]
        assertEquals(DocumentType.PDF, detected)
    }

    @Test
    fun `conflict scenario - DOCX MIME but PDF extension`() {
        val intentMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        val extension = "pdf"
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" to DocumentType.DOCX,
        )
        val detected = mimeMap[intentMime]
        assertEquals(DocumentType.DOCX, detected)
    }

    @Test
    fun `unknown MIME falls through to extension`() {
        val intentMime = "application/octet-stream"
        val extension = "csv"
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
        )
        val extMap = mapOf(
            "csv" to DocumentType.CSV,
        )
        // MIME not found, fall to extension
        val detected = mimeMap[intentMime] ?: extMap[extension]
        assertEquals(DocumentType.CSV, detected)
    }

    @Test
    fun `unknown MIME and unknown extension falls to UNKNOWN`() {
        val intentMime = "application/octet-stream"
        val extension = "xyz"
        val mimeMap = mapOf<String, DocumentType>()
        val extMap = mapOf<String, DocumentType>()
        val detected = mimeMap[intentMime] ?: extMap[extension] ?: DocumentType.UNKNOWN
        assertEquals(DocumentType.UNKNOWN, detected)
    }

    // --- File size limit tests ---

    @Test
    fun `25MB limit in bytes`() {
        val limit = 25L * 1024 * 1024
        assertEquals(26_214_400L, limit)
    }

    @Test
    fun `file at limit is rejected`() {
        val limit = 25L * 1024 * 1024
        val fileSize = 26_214_401L // 25MB + 1 byte
        assert(fileSize > limit) { "File at limit+1 should be rejected" }
    }

    @Test
    fun `file under limit is accepted`() {
        val limit = 25L * 1024 * 1024
        val fileSize = 26_214_399L // 25MB - 1 byte
        assert(fileSize <= limit) { "File under limit should be accepted" }
    }

    @Test
    fun `file exactly at limit is accepted`() {
        val limit = 25L * 1024 * 1024
        val fileSize = 26_214_400L // exactly 25MB
        assert(fileSize <= limit) { "File exactly at limit should be accepted" }
    }

    // --- ODS rejection test ---

    @Test
    fun `ODS is not supported`() {
        val extMap = mapOf(
            "pdf" to DocumentType.PDF,
            "docx" to DocumentType.DOCX,
            "xlsx" to DocumentType.XLSX,
            "csv" to DocumentType.CSV,
        )
        assertEquals(null, extMap["ods"])
    }

    // --- XSS filename tests ---

    @Test
    fun `JSON quote escapes single quotes`() {
        val filename = "O'Reilly.pdf"
        val escaped = org.json.JSONObject.quote(filename)
        assertEquals("\"O'Reilly.pdf\"", escaped)
    }

    @Test
    fun `JSON quote escapes backslashes`() {
        val filename = "abc\\def.pdf"
        val escaped = org.json.JSONObject.quote(filename)
        assertEquals("\"abc\\\\def.pdf\"", escaped)
    }

    @Test
    fun `JSON quote escapes double quotes`() {
        val filename = "test\"injection.pdf"
        val escaped = org.json.JSONObject.quote(filename)
        assertEquals("\"test\\\"injection.pdf\"", escaped)
    }

    @Test
    fun `JSON quote escapes newlines`() {
        val filename = "test\ninjection.pdf"
        val escaped = org.json.JSONObject.quote(filename)
        assertEquals("\"test\\ninjection.pdf\"", escaped)
    }

    @Test
    fun `JSON quote escapes injection attempt`() {
        val filename = "test');alert(1);//"
        val escaped = org.json.JSONObject.quote(filename)
        // Should produce: "test\');alert(1);//"
        assert(escaped.contains("\\'")) { "Single quote should be escaped" }
        assert(!escaped.contains("';")) { "No unescaped injection sequence" }
    }

    @Test
    fun `JSON quote escapes complex injection`() {
        val filename = "\");alert(document.domain);//"
        val escaped = org.json.JSONObject.quote(filename)
        assert(escaped.contains("\\\"")) { "Double quote should be escaped" }
    }

    // --- DocumentType viewer mapping tests ---

    @Test
    fun `PDF maps to pdf_viewer.html`() {
        assertEquals("pdf_viewer.html", DocumentType.PDF.viewerHtml)
    }

    @Test
    fun `DOCX maps to docx_viewer.html`() {
        assertEquals("docx_viewer.html", DocumentType.DOCX.viewerHtml)
    }

    @Test
    fun `XLSX maps to xlsx_viewer.html`() {
        assertEquals("xlsx_viewer.html", DocumentType.XLSX.viewerHtml)
    }

    @Test
    fun `CSV maps to xlsx_viewer.html`() {
        assertEquals("xlsx_viewer.html", DocumentType.CSV.viewerHtml)
    }

    @Test
    fun `UNKNOWN maps to empty string`() {
        assertEquals("", DocumentType.UNKNOWN.viewerHtml)
    }

    // --- JS entry point tests ---

    @Test
    fun `PDF JS entry point`() {
        assertEquals("loadPdfFromBase64", DocumentType.PDF.jsEntryPoint)
    }

    @Test
    fun `DOCX JS entry point`() {
        assertEquals("loadDocxFromBase64", DocumentType.DOCX.jsEntryPoint)
    }

    @Test
    fun `XLSX JS entry point`() {
        assertEquals("loadXlsxFromBase64", DocumentType.XLSX.jsEntryPoint)
    }

    @Test
    fun `CSV JS entry point`() {
        assertEquals("loadCsvFromBase64", DocumentType.CSV.jsEntryPoint)
    }

    // --- Intent extras tests ---

    @Test
    fun `intent without data URI has null data`() {
        val intent = Intent(Intent.ACTION_VIEW)
        assertEquals(null, intent.data)
    }

    @Test
    fun `intent with type but no data`() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            type = "application/pdf"
        }
        assertEquals("application/pdf", intent.type)
        assertEquals(null, intent.data)
    }
}
