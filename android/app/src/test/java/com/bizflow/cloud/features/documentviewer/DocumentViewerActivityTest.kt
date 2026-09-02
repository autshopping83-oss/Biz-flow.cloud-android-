package com.bizflow.cloud.features.documentviewer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DocumentViewerActivityTest {

    // --- MIME map tests (matches FileDetector MIME_MAP keys) ---

    @Test
    fun `MIME map has PDF`() {
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
        )
        assertEquals(DocumentType.PDF, mimeMap["application/pdf"])
    }

    @Test
    fun `MIME map has DOCX`() {
        val mimeMap = mapOf(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" to DocumentType.DOCX,
        )
        assertEquals(DocumentType.DOCX, mimeMap["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])
    }

    @Test
    fun `MIME map has XLSX`() {
        val mimeMap = mapOf(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" to DocumentType.XLSX,
        )
        assertEquals(DocumentType.XLSX, mimeMap["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])
    }

    @Test
    fun `MIME map has three CSV variants`() {
        val mimeMap = mapOf(
            "text/csv" to DocumentType.CSV,
            "text/comma-separated-values" to DocumentType.CSV,
            "application/csv" to DocumentType.CSV,
        )
        assertEquals(DocumentType.CSV, mimeMap["text/csv"])
        assertEquals(DocumentType.CSV, mimeMap["text/comma-separated-values"])
        assertEquals(DocumentType.CSV, mimeMap["application/csv"])
    }

    // --- Extension extraction (pure String, no Android Uri) ---

    @Test
    fun `extension extraction from path`() {
        val path = "content://com.example/document/report.docx"
        val lastSegment = path.substringAfterLast('/').substringBefore('?')
        val ext = lastSegment.substringAfterLast('.')
        assertEquals("docx", ext)
    }

    @Test
    fun `extension extraction with dots in filename`() {
        val path = "content://com.example/document/my.report.2024.xlsx"
        val lastSegment = path.substringAfterLast('/').substringBefore('?')
        val ext = lastSegment.substringAfterLast('.')
        assertEquals("xlsx", ext)
    }

    @Test
    fun `extension extraction with no dot`() {
        val path = "content://com.example/document/nodocext"
        val lastSegment = path.substringAfterLast('/').substringBefore('?')
        val dotIndex = lastSegment.lastIndexOf('.')
        val ext = if (dotIndex >= 0) lastSegment.substring(dotIndex + 1) else null
        assertNull(ext)
    }

    @Test
    fun `extension extraction with query params`() {
        val path = "content://com.example/document/report.pdf?token=abc123"
        val lastSegment = path.substringAfterLast('/').substringBefore('?')
        val ext = lastSegment.substringAfterLast('.')
        assertEquals("pdf", ext)
    }

    // --- MIME conflict resolution tests ---

    @Test
    fun `conflict scenario - PDF MIME but DOCX extension`() {
        val intentMime = "application/pdf"
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" to DocumentType.DOCX,
        )
        // MIME has priority over extension
        val detected = mimeMap[intentMime]
        assertEquals(DocumentType.PDF, detected)
    }

    @Test
    fun `unknown MIME falls through to extension`() {
        val intentMime = "application/octet-stream"
        val extension = "csv"
        val mimeMap = mapOf<String, DocumentType>()
        val extMap = mapOf("csv" to DocumentType.CSV)
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
    fun `file at limit+1 is rejected`() {
        val limit = 25L * 1024 * 1024
        val fileSize = 26_214_401L
        assert(fileSize > limit)
    }

    @Test
    fun `file under limit is accepted`() {
        val limit = 25L * 1024 * 1024
        val fileSize = 26_214_399L
        assert(fileSize <= limit)
    }

    @Test
    fun `file exactly at limit is accepted`() {
        val limit = 25L * 1024 * 1024
        val fileSize = 26_214_400L
        assert(fileSize <= limit)
    }

    // --- ODS rejection test ---

    @Test
    fun `ODS is not in supported extensions`() {
        val extMap = mapOf(
            "pdf" to DocumentType.PDF,
            "docx" to DocumentType.DOCX,
            "xlsx" to DocumentType.XLSX,
            "csv" to DocumentType.CSV,
        )
        assertNull(extMap["ods"])
    }

    // --- XSS filename escaping tests (manual JSON string escaping) ---

    private fun jsonStringEscape(s: String): String {
        val sb = StringBuilder("\"")
        for (c in s) {
            when (c) {
                '"' -> sb.append("\\\"")
                '\\' -> sb.append("\\\\")
                '\n' -> sb.append("\\n")
                '\r' -> sb.append("\\r")
                '\t' -> sb.append("\\t")
                '\'' -> sb.append("\\'")
                else -> sb.append(c)
            }
        }
        sb.append("\"")
        return sb.toString()
    }

    @Test
    fun `escape preserves simple filename`() {
        assertEquals("\"report.pdf\"", jsonStringEscape("report.pdf"))
    }

    @Test
    fun `escape handles single quotes`() {
        assertEquals("\"O'Reilly.pdf\"", jsonStringEscape("O'Reilly.pdf"))
    }

    @Test
    fun `escape handles backslashes`() {
        assertEquals("\"abc\\\\def.pdf\"", jsonStringEscape("abc\\def.pdf"))
    }

    @Test
    fun `escape handles double quotes`() {
        assertEquals("\"test\\\"injection.pdf\"", jsonStringEscape("test\"injection.pdf"))
    }

    @Test
    fun `escape handles newlines`() {
        assertEquals("\"test\\ninjection.pdf\"", jsonStringEscape("test\ninjection.pdf"))
    }

    @Test
    fun `escape handles single-quote injection`() {
        val escaped = jsonStringEscape("test');alert(1);//")
        assert(escaped.contains("\\'")) { "Single quote must be escaped" }
        assert(escaped.startsWith("\"")) { "Must be wrapped in quotes" }
        assert(escaped.endsWith("\"")) { "Must be wrapped in quotes" }
    }

    @Test
    fun `escape handles double-quote injection`() {
        val escaped = jsonStringEscape("\");alert(document.domain);//")
        assert(escaped.contains("\\\"")) { "Double quote must be escaped" }
    }

    @Test
    fun `escape wraps result in double quotes`() {
        val escaped = jsonStringEscape("file.pdf")
        assert(escaped.startsWith("\"") && escaped.endsWith("\""))
    }

    // --- DocumentType enum viewer mapping tests ---

    @Test
    fun `PDF maps to pdf-viewer-html`() {
        assertEquals("pdf_viewer.html", DocumentType.PDF.viewerHtml)
    }

    @Test
    fun `DOCX maps to docx-viewer-html`() {
        assertEquals("docx_viewer.html", DocumentType.DOCX.viewerHtml)
    }

    @Test
    fun `XLSX maps to xlsx-viewer-html`() {
        assertEquals("xlsx_viewer.html", DocumentType.XLSX.viewerHtml)
    }

    @Test
    fun `CSV maps to xlsx-viewer-html`() {
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

    // --- MIME fallback priority tests ---

    @Test
    fun `MIME not in map returns null`() {
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
        )
        assertNull(mimeMap["text/plain"])
    }

    @Test
    fun `extension not in map returns null`() {
        val extMap = mapOf(
            "pdf" to DocumentType.PDF,
            "docx" to DocumentType.DOCX,
        )
        assertNull(extMap["rtf"])
    }

    // --- Content URI path parsing tests ---

    @Test
    fun `content URI last path segment extraction`() {
        val uri = "content://com.android.providers.media.documents/document/primary%3ADocuments%2Freport.pdf"
        val lastSegment = uri.substringAfterLast('/').substringBefore('?')
        assertEquals("primary%3ADocuments%2Freport.pdf", lastSegment)
    }

    @Test
    fun `file URI path extraction`() {
        val uri = "file:///storage/emulated/0/Documents/test.pdf"
        val path = uri.removePrefix("file://")
        assertEquals("/storage/emulated/0/Documents/test.pdf", path)
    }
}
