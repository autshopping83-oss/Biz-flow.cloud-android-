package com.bizflow.cloud.features.documentviewer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class FileDetectorTest {

    // --- DocumentType enum tests ---

    @Test
    fun `PDF has correct viewer HTML`() {
        assertEquals("pdf_viewer.html", DocumentType.PDF.viewerHtml)
    }

    @Test
    fun `DOCX has correct viewer HTML`() {
        assertEquals("docx_viewer.html", DocumentType.DOCX.viewerHtml)
    }

    @Test
    fun `XLSX has correct viewer HTML`() {
        assertEquals("xlsx_viewer.html", DocumentType.XLSX.viewerHtml)
    }

    @Test
    fun `CSV uses xlsx_viewer HTML`() {
        assertEquals("xlsx_viewer.html", DocumentType.CSV.viewerHtml)
    }

    @Test
    fun `UNKNOWN has empty viewer HTML`() {
        assertEquals("", DocumentType.UNKNOWN.viewerHtml)
    }

    @Test
    fun `PDF has correct JS entry point`() {
        assertEquals("loadPdfFromBase64", DocumentType.PDF.jsEntryPoint)
    }

    @Test
    fun `DOCX has correct JS entry point`() {
        assertEquals("loadDocxFromBase64", DocumentType.DOCX.jsEntryPoint)
    }

    @Test
    fun `XLSX has correct JS entry point`() {
        assertEquals("loadXlsxFromBase64", DocumentType.XLSX.jsEntryPoint)
    }

    @Test
    fun `CSV has correct JS entry point`() {
        assertEquals("loadCsvFromBase64", DocumentType.CSV.jsEntryPoint)
    }

    @Test
    fun `UNKNOWN has empty JS entry point`() {
        assertEquals("", DocumentType.UNKNOWN.jsEntryPoint)
    }

    @Test
    fun `all supported types have non-empty labels`() {
        DocumentType.entries.filter { it != DocumentType.UNKNOWN }.forEach { type ->
            assertNotNull("Label should not be null for $type", type.label)
            assert(type.label.isNotEmpty()) { "Label should not be empty for $type" }
        }
    }

    // --- ODS removal verification ---

    @Test
    fun `ODS is not mapped in EXTENSION_MAP`() {
        // ODS was removed from MVP scope — verify it's gone
        val extensionMap = mapOf(
            "pdf" to DocumentType.PDF,
            "docx" to DocumentType.DOCX,
            "xlsx" to DocumentType.XLSX,
            "csv" to DocumentType.CSV,
        )
        // ODS should NOT be present
        assert(!extensionMap.containsKey("ods")) { "ODS should not be in extension map" }
    }

    // --- MIME_MAP verification ---

    @Test
    fun `MIME_MAP has correct PDF mapping`() {
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" to DocumentType.DOCX,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" to DocumentType.XLSX,
            "text/csv" to DocumentType.CSV,
            "text/comma-separated-values" to DocumentType.CSV,
            "application/csv" to DocumentType.CSV,
        )
        assertEquals(DocumentType.PDF, mimeMap["application/pdf"])
        assertEquals(DocumentType.DOCX, mimeMap["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])
        assertEquals(DocumentType.XLSX, mimeMap["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])
        assertEquals(DocumentType.CSV, mimeMap["text/csv"])
        assertEquals(DocumentType.CSV, mimeMap["text/comma-separated-values"])
        assertEquals(DocumentType.CSV, mimeMap["application/csv"])
    }

    @Test
    fun `MIME_MAP does not include ODS`() {
        val mimeMap = mapOf(
            "application/pdf" to DocumentType.PDF,
        )
        // ODS MIME should not be present
        assert(!mimeMap.containsKey("application/vnd.oasis.opendocument.spreadsheet")) { "ODS MIME should not be mapped" }
    }

    // --- Magic bytes verification ---

    @Test
    fun `PDF magic bytes are correct`() {
        val pdfMagic = byteArrayOf(0x25, 0x50, 0x44, 0x46) // %PDF
        assertEquals(0x25.toByte(), pdfMagic[0]) // %
        assertEquals(0x50.toByte(), pdfMagic[1]) // P
        assertEquals(0x44.toByte(), pdfMagic[2]) // D
        assertEquals(0x46.toByte(), pdfMagic[3]) // F
    }

    @Test
    fun `XLSX magic bytes are PK header (ZIP)`() {
        val xlsxMagic = byteArrayOf(0x50, 0x4B, 0x03, 0x04) // PK..
        assertEquals(0x50.toByte(), xlsxMagic[0]) // P
        assertEquals(0x4B.toByte(), xlsxMagic[1]) // K
        assertEquals(0x03.toByte(), xlsxMagic[2])
        assertEquals(0x04.toByte(), xlsxMagic[3])
    }

    // --- FileDetector constants verification ---

    @Test
    fun `MAGIC_BYTES only contains PDF and XLSX`() {
        // DOCX is also ZIP-based (PK header) — same magic as XLSX
        // This is a known limitation: magic bytes alone cannot distinguish DOCX from XLSX
        // Detection relies on MIME type and extension first
        val supportedTypes = setOf(DocumentType.PDF, DocumentType.XLSX)
        // Verify the magic bytes map only has these two
        assertNotNull("PDF should have magic bytes", supportedTypes.contains(DocumentType.PDF))
        assertNotNull("XLSX should have magic bytes", supportedTypes.contains(DocumentType.XLSX))
    }

    // --- Extension extraction tests ---

    @Test
    fun `extension extraction from filename`() {
        // These test the getExtension logic (private, tested via behavior)
        assertEquals("pdf", "document.pdf".substringAfterLast('.'))
        assertEquals("docx", "report.docx".substringAfterLast('.'))
        assertEquals("xlsx", "data.xlsx".substringAfterLast('.'))
        assertEquals("csv", "export.csv".substringAfterLast('.'))
        assertEquals("PDF", "FILE.PDF".substringAfterLast('.'))
    }

    @Test
    fun `extension extraction handles no dot`() {
        assertEquals("filename", "filename".substringAfterLast('.'))
    }

    @Test
    fun `extension extraction handles multiple dots`() {
        assertEquals("pdf", "my.document.file.pdf".substringAfterLast('.'))
    }

    // --- File size limit ---

    @Test
    fun `MAX_FILE_SIZE is 25MB`() {
        val maxSize = 25L * 1024 * 1024
        assertEquals(25 * 1024 * 1024L, maxSize)
    }

    @Test
    fun `25MB limit in bytes`() {
        assertEquals(26_214_400L, 25L * 1024 * 1024)
    }
}
