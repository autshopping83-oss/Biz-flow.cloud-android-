# PDF Actions Implementation Audit

**Date:** 2026-09-04
**CI:** Run #175 SUCCESS (747f268a)
**Branch:** feat/phase-0-native

---

## Architecture Overview

### Single-Path PDF Generation

All three actions share a single PDF generation pipeline:

```
HTML Template
    ↓
WebView (off-screen, A4 viewport)
    ↓
Bitmap (300 DPI, 2480×3508px)
    ↓
android.graphics.pdf.PdfDocument
    ↓
byte[] (real .pdf file)
    ├── Save → Documents/Biz-flow.cloud/
    ├── Share → FileProvider cache → Android Sharesheet
    └── Save+Print → Documents/ + PrintManager
```

### Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `PdfGeneratorRepositoryImpl.kt` | Rewritten | Core: generatePdfBytes(), savePdfToDocuments(), sharePdfViaFileProvider(), saveAndPrintPdf(), ByteArrayPrintDocumentAdapter |
| `PdfRenderHelper.java` | Deleted | Replaced by PdfDocument API in Kotlin |
| `PdfPreviewDialog.kt` | Updated | 3 buttons: Save, Share, Save+Print |
| `CreateDocumentViewModel.kt` | Updated | 3 actions: savePdfToDisk(), sharePdf(), saveAndPrintPdf() |
| `CreateDocumentScreen.kt` | Updated | Wired 3 actions to ViewModel |
| `file_paths.xml` | Updated | Added `shared_pdfs` cache path for FileProvider |
| `values/strings.xml` (×7) | Updated | Added editor_save_and_print, pdf_saved_ok, pdf_save_error |

---

## Action 1: SAVE

**Flow:** Generate PDF → Save to `Documents/Biz-flow.cloud/`

### Android APIs Used
- **Android Q+ (API 29):** `MediaStore.Files.getContentUri(VOLUME_EXTERNAL_PRIMARY)` with `RELATIVE_PATH = "Biz-flow.cloud"`
- **Pre-Q (API 22-28):** `Environment.getExternalStoragePublicDirectory(DIRECTORY_DOCUMENTS)` + direct file write

### Non-Clobber Strategy
- Queries `MediaStore.Files` for existing file with same name
- If exists: appends `(1)`, `(2)`, etc.
- Pre-Q: checks `File.exists()` and appends suffix

### File Naming
- Format: `Fatura-BF-{number}.pdf` (e.g., `Fatura-BF-FATURA-2026-0092.pdf`)
- Sanitized through document number generation

### Permissions
- No `WRITE_EXTERNAL_STORAGE` needed on Q+ (MediaStore handles it)
- Pre-Q: `WRITE_EXTERNAL_STORAGE` declared in manifest (already present)
- No dangerous permissions requested at runtime

### Post-Save
- Toast: "PDF guardado em Documents/Biz-flow.cloud/..."
- No auto-open, no share sheet, no print dialog

---

## Action 2: SHARE

**Flow:** Generate PDF → Save to cache → FileProvider `content://` URI → `ACTION_SEND`

### Android APIs Used
- `FileProvider.getUriForFile()` → `content://` URI
- `Intent.ACTION_SEND` with `Intent.createChooser()`
- `Intent.EXTRA_STREAM` + `FLAG_GRANT_READ_URI_PERMISSION`

### FileProvider Configuration
```xml
<cache-path name="shared_pdfs" path="shared_pdfs/" />
```
- URI: `content://{applicationId}.fileprovider/shared_pdfs/...`
- No `file://` URIs exposed to external apps

### Sharesheet
- Uses Android native sharesheet (no custom app selector)
- Compatible apps: WhatsApp, Gmail, Telegram, Bluetooth, Drive, etc.
- MIME type: `application/pdf`

### Privacy
- PDF bytes never leave device (no upload)
- Cached file is in app-private cache directory
- No server communication, no analytics logging

---

## Action 3: SAVE + PRINT

**Flow:** Generate PDF → Save to `Documents/Biz-flow.cloud/` → Print via `PrintManager`

### Android APIs Used
- `PrintManager.print(jobName, adapter, printAttributes)`
- `ByteArrayPrintDocumentAdapter` (custom inner class)
- `PrintAttributes` (A4, color mode)

### ByteArrayPrintDocumentAdapter
- Receives pre-generated `byte[]`
- `onLayout()`: reports 1-page document
- `onWrite()`: writes bytes directly to `ParcelFileDescriptor`
- `onFinish()`: releases printing lock

### Same PDF for Both Operations
- PDF bytes generated once by `generatePdfBytes()`
- Same bytes saved to disk AND delivered to PrintManager
- No duplicate generation

### Print Configuration
- Paper: A4 (`PrintAttributes.MediaSize.ISO_A4`)
- Margins: None (`PrintAttributes.Margins.NO_MARGINS`)
- Job name: `Documento_{number}`
- Color: Color mode

### Error Handling
- `onWriteFailed`: reports error via callback
- `onFinish`: always releases `printing` AtomicBoolean
- Null bytes → operation cancelled gracefully

---

## PDF Generation Details

### WebView Rendering
- Off-screen WebView (not attached to any view hierarchy)
- JavaScript disabled
- File access disabled
- Default encoding: UTF-8

### Bitmap Rasterization
- Viewport: A4 at 300 DPI = 2480 × 3508 pixels
- Config: `ARGB_8888` (highest quality)
- `WebView.draw(canvas)` renders HTML to bitmap

### PdfDocument Creation
- `android.graphics.pdf.PdfDocument` (API 19+, project minSdk 22)
- Single page per document (invoices are 1 page)
- Page size: 2480 × 3508 pixels (maps to A4 at 300 DPI)

### Quality Notes
- Text is rasterized (bitmap-based PDF), not vector
- At 300 DPI, text is crisp for printing and screen viewing
- Trade-off: text not selectable in PDF viewer (acceptable for invoices)

---

## Privacy & Security

### Data Handling
- PDF generated entirely on-device
- No network calls during PDF generation
- No Supabase upload
- No analytics events for PDF content
- No logging of invoice values or client data

### FileProvider Security
- Restricted to `cache-path` and `external-files-path`
- No `<external-path path="." />` (was removed in prior audit)
- `content://` URIs only, never `file://`
- `FLAG_GRANT_READ_URI_PERMISSION` for temporary access

---

## Regression Checklist

| Item | Status |
|------|--------|
| PDF generation works | ✅ CI #175 green |
| Save to Documents/Biz-flow.cloud/ | ✅ Implemented |
| Share via Android Sharesheet | ✅ Implemented |
| Save+Print saves then prints | ✅ Implemented |
| Document Viewer unaffected | ✅ No changes to viewer code |
| ACTION_VIEW for documents | ✅ Unchanged |
| FileProvider security | ✅ No external-path, content:// only |
| minSdk 22 | ✅ PdfDocument available since API 19 |
| targetSdk 36 | ✅ Unchanged |
| No server upload | ✅ All on-device |
| 7 locale strings | ✅ Updated |

---

## Limitations

1. **Bitmap-based PDF:** Text is rasterized, not selectable. Acceptable for invoices; may not be ideal for text-heavy multi-page documents.
2. **Single-page only:** Current implementation handles 1 page. Multi-page support would require splitting content across pages.
3. **Memory usage:** A4 at 300 DPI bitmap = ~34MB. Acceptable for modern devices but could be an issue on very low-end devices.
4. **Print quality:** PrintManager receives bitmap-based PDF. For most invoices this is fine, but vector PDFs would be sharper for professional printing.
