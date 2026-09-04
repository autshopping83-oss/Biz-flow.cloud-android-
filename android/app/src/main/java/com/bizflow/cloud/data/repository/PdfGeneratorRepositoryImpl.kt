package com.bizflow.cloud.data.repository

import android.content.ContentValues
import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.os.ParcelFileDescriptor.AutoCloseOutputStream
import android.os.CancellationSignal
import android.os.Bundle
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import android.provider.MediaStore
import android.webkit.WebView
import android.webkit.WebViewClient
import com.bizflow.cloud.R
import com.bizflow.cloud.core.util.ImageFiles
import com.bizflow.cloud.core.util.formatDate
import com.bizflow.cloud.core.util.formatMoney
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

class PdfGeneratorRepositoryImpl(
    private val applicationContext: Context,
    private val companySettingsRepository: CompanySettingsRepository,
) {
    private val appContext get() = applicationContext
    private val mainHandler = Handler(Looper.getMainLooper())
    private val printing = AtomicBoolean(false)
    private var activeWebView: WebView? = null

    companion object {
        private const val FOLDER_NAME = "Biz-flow.cloud"
        private const val PDF_MIME = "application/pdf"
        private const val A4_WIDTH_PT = 595
        private const val A4_HEIGHT_PT = 842
        private const val TARGET_DPI = 300
        private val A4_WIDTH_PX = (A4_WIDTH_PT.toFloat() * TARGET_DPI / 72).toInt()
        private val A4_HEIGHT_PX = (A4_HEIGHT_PT.toFloat() * TARGET_DPI / 72).toInt()
    }

    private fun localizedContext(localeTag: String): Context {
        val locale = Locale.forLanguageTag(localeTag)
        val config = Configuration(applicationContext.resources.configuration)
        config.setLocale(locale)
        return applicationContext.createConfigurationContext(config)
    }

    suspend fun buildHtml(
        document: DocumentEntity,
        items: List<LineItemEntity>,
        localeTag: String = "pt",
    ): String = withContext(Dispatchers.IO) {
        val settings = companySettingsRepository.getSettings()
        val templateId = settings?.documentTemplateId ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID
        val template = readTemplate(templateId)
        val ctx = localizedContext(localeTag)
        buildFromTemplate(template, settings, document, items, ctx, localeTag)
    }

    suspend fun generatePdf(context: Context, document: DocumentEntity, items: List<LineItemEntity>) {
        val html = buildHtml(document, items)
        printHtml(context, html, "Documento_${document.number}")
    }

    // ── Single-path PDF generation ──────────────────────────────────────

    suspend fun generatePdfBytes(html: String): ByteArray? =
        withContext(Dispatchers.Main) {
            suspendCancellableCoroutine { cont ->
                val webView = WebView(appContext)
                webView.setBackgroundColor(Color.TRANSPARENT)
                webView.settings.javaScriptEnabled = false
                webView.settings.allowFileAccess = false
                webView.settings.defaultTextEncodingName = "UTF-8"

                webView.layout(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX)

                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        try {
                            val bitmap = Bitmap.createBitmap(
                                A4_WIDTH_PX, A4_HEIGHT_PX, Bitmap.Config.ARGB_8888
                            )
                            val canvas = Canvas(bitmap)
                            webView.draw(canvas)

                            val pdfDocument = PdfDocument()
                            val pageInfo = PdfDocument.PageInfo.Builder(
                                A4_WIDTH_PX, A4_HEIGHT_PX, 1
                            ).create()
                            val page = pdfDocument.startPage(pageInfo)
                            page.canvas.drawBitmap(bitmap, 0f, 0f, null)
                            pdfDocument.finishPage(page)

                            val output = ByteArrayOutputStream()
                            pdfDocument.writeTo(output)

                            bitmap.recycle()
                            pdfDocument.close()
                            webView.destroy()

                            if (cont.isActive) cont.resume(output.toByteArray())
                        } catch (e: Exception) {
                            webView.destroy()
                            if (cont.isActive) cont.resume(null)
                        }
                    }
                }

                webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
                cont.invokeOnCancellation {
                    mainHandler.post { webView.destroy() }
                }
            }
        }

    // ── Save: PDF → Documents/Biz-flow.cloud/ ──────────────────────────

    suspend fun savePdfToDocuments(context: Context, html: String, fileName: String): Uri? {
        val bytes = generatePdfBytes(html) ?: return null
        return withContext(Dispatchers.IO) {
            val safeName = uniqueFileName(context, fileName)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveBytesViaMediaStore(context, bytes, safeName)
            } else {
                saveBytesViaFile(context, bytes, safeName)
            }
        }
    }

    // ── Share: PDF → content:// URI via FileProvider ────────────────────

    suspend fun sharePdfViaFileProvider(context: Context, html: String, fileName: String): Uri? {
        val bytes = generatePdfBytes(html) ?: return null
        return withContext(Dispatchers.IO) {
            val cacheDir = File(context.cacheDir, "shared_pdfs")
            cacheDir.mkdirs()
            val file = File(cacheDir, "$fileName.pdf")
            file.writeBytes(bytes)
            try {
                androidx.core.content.FileProvider.getUriForFile(
                    context, "${context.packageName}.fileprovider", file
                )
            } catch (_: Exception) {
                null
            }
        }
    }

    // ── Print: PDF bytes → PrintManager ─────────────────────────────────

    fun printPdf(context: Context, html: String, jobName: String) {
        if (printing.get()) return
        mainHandler.post {
            if (printing.compareAndSet(false, true)) {
                startPrint(context.applicationContext, html, jobName)
            }
        }
    }

    suspend fun saveAndPrintPdf(
        context: Context,
        html: String,
        fileName: String,
        jobName: String,
    ): Uri? {
        val bytes = generatePdfBytes(html) ?: return null
        val uri = withContext(Dispatchers.IO) {
            val safeName = uniqueFileName(context, fileName)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveBytesViaMediaStore(context, bytes, safeName)
            } else {
                saveBytesViaFile(context, bytes, safeName)
            }
        }
        printPdfFromBytes(context, bytes, jobName)
        return uri
    }

    private fun printPdfFromBytes(context: Context, pdfBytes: ByteArray, jobName: String) {
        if (printing.get()) return
        mainHandler.post {
            if (printing.compareAndSet(false, true)) {
                val printManager = context.getSystemService(PrintManager::class.java)
                val attrs = PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .build()
                val adapter = ByteArrayPrintDocumentAdapter(pdfBytes, jobName) {
                    printing.set(false)
                }
                printManager.print(jobName, adapter, attrs)
            }
        }
    }

    fun printHtml(context: Context, html: String, jobName: String) {
        if (printing.get()) return
        mainHandler.post {
            if (printing.compareAndSet(false, true)) {
                startPrint(context.applicationContext, html, jobName)
            }
        }
    }

    // ── Storage helpers ─────────────────────────────────────────────────

    private fun uniqueFileName(context: Context, baseName: String): String {
        var name = baseName
        var suffix = 0
        val resolver = context.contentResolver
        while (true) {
            val uri = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            val projection = arrayOf(MediaStore.MediaColumns._ID)
            val selection =
                "${MediaStore.MediaColumns.RELATIVE_PATH}=? AND ${MediaStore.MediaColumns.DISPLAY_NAME}=?"
            val selectionArgs = arrayOf("$FOLDER_NAME/", "$name.pdf")
            val exists = resolver.query(uri, projection, selection, selectionArgs, null)?.use {
                it.moveToFirst()
            } ?: false
            if (!exists) return name
            suffix++
            name = "${baseName} ($suffix)"
        }
    }

    private fun saveBytesViaMediaStore(context: Context, bytes: ByteArray, fileName: String): Uri? {
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, "$fileName.pdf")
            put(MediaStore.MediaColumns.MIME_TYPE, PDF_MIME)
            put(MediaStore.MediaColumns.RELATIVE_PATH, FOLDER_NAME)
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
        val collection = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        val uri = context.contentResolver.insert(collection, values) ?: return null
        context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
        values.clear()
        values.put(MediaStore.MediaColumns.IS_PENDING, 0)
        context.contentResolver.update(uri, values, null, null)
        return uri
    }

    private fun saveBytesViaFile(context: Context, bytes: ByteArray, fileName: String): Uri? {
        val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), FOLDER_NAME)
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, "$fileName.pdf")
        if (file.exists()) {
            var suffix = 1
            var candidate = File(dir, "$fileName ($suffix).pdf")
            while (candidate.exists()) {
                suffix++
                candidate = File(dir, "$fileName ($suffix).pdf")
            }
            candidate.writeBytes(bytes)
            return Uri.fromFile(candidate)
        }
        file.writeBytes(bytes)
        return Uri.fromFile(file)
    }

    // ── Legacy print via WebView (kept for backward compat) ─────────────

    private fun startPrint(context: Context, html: String, jobName: String) {
        val webView = WebView(context)
        activeWebView = webView
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.settings.javaScriptEnabled = false
        webView.settings.allowFileAccess = false
        webView.settings.defaultTextEncodingName = "UTF-8"
        val printAttributes = PrintAttributes.Builder()
            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
            .build()
        val dpi = printAttributes.resolution?.horizontalDpi?.toFloat() ?: 96f
        val widthInches = printAttributes.mediaSize?.widthMils?.div(1000f) ?: 8.27f
        webView.layout(0, 0, (widthInches * dpi).toInt(), (widthInches * dpi * 4f / 3f).toInt())
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                val inner = webView.createPrintDocumentAdapter(jobName)
                val adapter = TrackedPrintDocumentAdapter(inner) {
                    webView.stopLoading()
                    webView.webChromeClient = null
                    webView.destroy()
                    activeWebView = null
                    printing.set(false)
                }
                val printManager = context.getSystemService(PrintManager::class.java)
                printManager.print(jobName, adapter, printAttributes)
            }
        }
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
    }

    // ── ByteArrayPrintDocumentAdapter ───────────────────────────────────

    private class ByteArrayPrintDocumentAdapter(
        private val pdfBytes: ByteArray,
        private val jobName: String,
        private val onFinished: () -> Unit,
    ) : PrintDocumentAdapter() {
        override fun onLayout(
            oldAttributes: PrintAttributes?,
            newAttributes: PrintAttributes?,
            cancellationSignal: CancellationSignal?,
            callback: LayoutResultCallback?,
            extras: Bundle?,
        ) {
            val info = PrintDocumentInfo.Builder(jobName)
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(1)
                .build()
            callback?.onLayoutFinished(info, false)
        }

        override fun onWrite(
            pages: Array<out PageRange>?,
            destination: ParcelFileDescriptor?,
            cancellationSignal: CancellationSignal?,
            callback: WriteResultCallback?,
        ) {
            try {
                AutoCloseOutputStream(destination).use { it.write(pdfBytes) }
                callback?.onWriteFinished(pages ?: arrayOf(PageRange.ALL_PAGES))
            } catch (e: Exception) {
                callback?.onWriteFailed(e.message)
            } finally {
                onFinished()
            }
        }

        override fun onFinish() {
            onFinished()
        }
    }

    private class TrackedPrintDocumentAdapter(
        private val inner: PrintDocumentAdapter,
        private val onFinished: () -> Unit,
    ) : PrintDocumentAdapter() {
        override fun onLayout(
            oldAttributes: PrintAttributes?,
            newAttributes: PrintAttributes?,
            cancellationSignal: CancellationSignal?,
            callback: LayoutResultCallback?,
            extras: Bundle?,
        ) {
            inner.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras)
        }

        override fun onWrite(
            pages: Array<out PageRange>?,
            destination: ParcelFileDescriptor?,
            cancellationSignal: CancellationSignal?,
            callback: WriteResultCallback?,
        ) {
            inner.onWrite(pages, destination, cancellationSignal, callback)
        }

        override fun onFinish() {
            inner.onFinish()
            onFinished()
        }
    }

    // ── Template building ───────────────────────────────────────────────

    private fun readTemplate(templateId: String): String {
        return applicationContext.assets.open("templates/$templateId.html")
            .bufferedReader(Charsets.UTF_8)
            .use { it.readText() }
    }

    private fun buildFromTemplate(
        template: String,
        settings: CompanySettingsEntity?,
        document: DocumentEntity,
        items: List<LineItemEntity>,
        ctx: Context,
        localeTag: String,
    ): String {
        val locale = Locale.forLanguageTag(localeTag)
        return template
            .replace("{{LANG}}", langAttr(localeTag))
            .replace("{{COMPANY_LOGO_HTML}}", logoHtml(settings?.logoPath?.takeIf { contentExists(it) }
                ?: document.companyLogo))
            .replace("{{COMPANY_NAME}}", html(document.companyName ?: ""))
            .replace("{{COMPANY_DETAILS}}", html(companyDetails(document)))
            .replace("{{DOC_TITLE}}", documentTitle(document.documentType, ctx))
            .replace("{{DOC_NUMBER}}", html(document.number))
            .replace("{{DOC_DATE}}", formatDate(document.date, locale))
            .replace("{{CLIENT_NAME}}", html(document.clientName))
            .replace("{{CLIENT_DETAILS}}", html(clientDetails(document, ctx)))
            .replace("{{PAYMENT_METHOD_INFO}}", html(document.paymentMethod ?: "\u2014"))
            .replace("{{ITEMS_TABLE_ROWS}}", itemsTableRows(items, document.currency, locale))
            .replace("{{LABEL_NUMBER}}", ctx.getString(R.string.pdf_label_number))
            .replace("{{LABEL_DATE}}", ctx.getString(R.string.pdf_label_date))
            .replace("{{LABEL_CLIENT}}", ctx.getString(R.string.pdf_label_client))
            .replace("{{LABEL_CLIENT_ALT}}", ctx.getString(R.string.pdf_label_client_alt))
            .replace("{{LABEL_PAYMENT}}", ctx.getString(R.string.pdf_label_payment))
            .replace("{{LABEL_NOTES}}", ctx.getString(R.string.pdf_label_notes))
            .replace("{{LABEL_SUBTOTAL}}", ctx.getString(R.string.pdf_label_subtotal))
            .replace("{{LABEL_TOTAL}}", ctx.getString(R.string.pdf_label_total))
            .replace("{{HEADER_DESCRIPTION}}", ctx.getString(R.string.pdf_header_description))
            .replace("{{HEADER_UNIT_PRICE}}", ctx.getString(R.string.pdf_header_unit_price))
            .replace("{{HEADER_PRICE}}", ctx.getString(R.string.pdf_header_price))
            .replace("{{HEADER_QUANTITY}}", ctx.getString(R.string.pdf_header_quantity))
            .replace("{{HEADER_TOTAL}}", ctx.getString(R.string.pdf_label_total))
            .replace("{{TAX_LABEL}}", ctx.getString(R.string.pdf_label_tax).trimEnd(':', ' ') +
                " (${(document.taxRate * 100).toInt()}%)")
            .replace("{{SUBTOTAL}}", formatMoney(document.subtotal, document.currency, locale))
            .replace("{{TAX_AMOUNT}}", formatMoney(document.taxAmount, document.currency, locale))
            .replace("{{TOTAL_AMOUNT}}", formatMoney(document.total, document.currency, locale))
            .replace("{{STATUS_SEAL_HTML}}", statusSealHtml(document.status, ctx))
            .replace("{{COMPANY_STAMP_HTML}}", companyStampHtml(settings?.stampPath, document.stampText))
            .replace("{{TERMS_AND_CONDITIONS}}", html(document.stampText ?: ""))
            .replace("{{SIGNATURE_HTML}}", signatureHtml(resolveSignature(document, settings)))
            .replace("{{FOOTER_SIGNATURE}}", ctx.getString(R.string.pdf_footer_signature))
            .replace("{{FOOTER_PROCESSED}}", ctx.getString(R.string.pdf_footer_processed))
            .replace("{{FOOTER_THANKS}}", ctx.getString(R.string.pdf_footer_thanks))
    }

    private fun langAttr(localeTag: String): String {
        return when (localeTag) {
            "zh-CN" -> "zh-Hans"
            else -> localeTag
        }
    }

    private fun contentExists(path: String?): Boolean =
        path != null && File(path).exists()

    private fun resolveSignature(document: DocumentEntity, settings: CompanySettingsEntity?): String? {
        return document.signaturePath
            ?: settings?.defaultSignaturePath
            ?: document.signatureData
    }

    private fun companyStampHtml(stampPath: String?, stampText: String?): String {
        if (stampPath != null && contentExists(stampPath)) {
            return ImageFiles.toDataUrl(stampPath)?.let { dataUrl ->
                "<img src=\"$dataUrl\" style=\"max-height:52px; max-width:120px; display:inline-block; vertical-align:middle;\">"
            } ?: ""
        }
        return if (stampText.isNullOrBlank()) "" else {
            "<span style=\"border:2px dashed #999; color:#666; border-radius:8px; padding:4px 10px; " +
                "font-size:11px; font-weight:700; display:inline-block; vertical-align:middle;\">${html(stampText)}</span>"
        }
    }

    private fun statusSealHtml(status: DocumentStatus, ctx: Context): String {
        if (status == DocumentStatus.EMITIDO) return ""
        val label = when (status) {
            DocumentStatus.PAGO -> ctx.getString(R.string.status_paid)
            DocumentStatus.PENDENTE -> ctx.getString(R.string.status_pending)
            DocumentStatus.ANULADO -> ctx.getString(R.string.status_cancelled)
            DocumentStatus.EMITIDO -> ""
        }
        return "<div style=\"position:absolute; top:44%; left:50%; transform:translate(-50%,-50%) rotate(-20deg); " +
            "border:6px solid #C62828; color:#C62828; border-radius:14px; padding:10px 30px; " +
            "font-size:44px; font-weight:900; letter-spacing:8px; opacity:0.16;\">${html(label.uppercase())}</div>"
    }

    private fun companyDetails(document: DocumentEntity): String {
        return buildList {
            document.companyTradingName?.takeIf { it.isNotBlank() }?.let { add(it) }
            document.companyAddress?.takeIf { it.isNotBlank() }?.let { add(it) }
            listOf(document.companyCity, document.companyCountry)
                .filter { !it.isNullOrBlank() }
                .joinToString(", ")
                .takeIf { it.isNotBlank() }?.let { add(it) }
            (document.companyIdentifierValue?.takeIf { it.isNotBlank() } ?: document.companyNuit?.takeIf { it.isNotBlank() })
                ?.let {
                    val type = document.companyIdentifierType?.takeIf { it.isNotBlank() } ?: "ID"
                    add("$type: $it")
                }
            listOf(
                document.companyContact,
                document.companyWhatsApp,
                document.companyEmail,
                document.companyWebsite,
            ).filter { !it.isNullOrBlank() }.forEach { add(it) }
        }.joinToString(" \u2022 ")
    }

    private fun clientDetails(document: DocumentEntity, ctx: Context): String {
        return buildList {
            document.clientLocation.takeIf { it.isNotBlank() }?.let { add(it) }
            document.clientNuit.takeIf { it.isNotBlank() }?.let {
                add("${ctx.getString(R.string.pdf_label_nuit)} $it")
            }
            document.clientContact.takeIf { it.isNotBlank() }?.let { add(it) }
            document.clientWhatsApp?.takeIf { it.isNotBlank() }?.let { add(it) }
        }.joinToString(" \u2022 ")
    }

    private fun itemsTableRows(items: List<LineItemEntity>, currency: String, locale: Locale): String {
        return items.joinToString(separator = "\n      ") { item ->
            "<tr><td>${html(item.description)}</td>" +
                "<td style=\"text-align:right\">${formatMoney(item.unitPrice, currency, locale)}</td>" +
                "<td style=\"text-align:right\">${formatQuantity(item.quantity)}</td>" +
                "<td style=\"text-align:right\">${formatMoney(item.total, currency, locale)}</td></tr>"
        }
    }

    private fun documentTitle(type: DocumentType, ctx: Context): String {
        return when (type) {
            DocumentType.FATURA -> ctx.getString(R.string.document_type_invoice)
            DocumentType.FATURA_RECIBO -> ctx.getString(R.string.document_type_invoice_receipt)
            DocumentType.RECIBO -> ctx.getString(R.string.document_type_receipt)
            DocumentType.ORCAMENTO -> ctx.getString(R.string.document_type_quote)
        }
    }

    private fun logoHtml(logo: String?): String {
        if (logo.isNullOrBlank()) return ""
        val src = if (logo.startsWith("data:")) logo else ImageFiles.toDataUrl(logo) ?: return ""
        return "<img src=\"$src\" style=\"max-height:56px; max-width:160px; display:block;\">"
    }

    private fun signatureHtml(signature: String?): String {
        if (signature.isNullOrBlank()) return ""
        val src = if (signature.startsWith("data:")) signature else ImageFiles.toDataUrl(signature) ?: return ""
        return "<img src=\"$src\" style=\"max-height:46px; display:block; margin:0 auto;\">"
    }

    private fun formatQuantity(quantity: Double): String {
        return if (quantity == quantity.toLong().toDouble()) {
            quantity.toLong().toString()
        } else {
            quantity.toString()
        }
    }

    private fun html(value: String): String {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    }
}
