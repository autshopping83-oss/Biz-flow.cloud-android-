package com.bizflow.cloud.data.repository

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.os.ParcelFileDescriptor.MODE_CREATE
import android.os.ParcelFileDescriptor.MODE_WRITE_ONLY
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.provider.MediaStore
import android.webkit.WebView
import android.webkit.WebViewClient
import com.bizflow.cloud.core.util.ImageFiles
import com.bizflow.cloud.core.util.formatDate
import com.bizflow.cloud.core.util.formatMoney
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import java.io.File
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

    suspend fun buildHtml(document: DocumentEntity, items: List<LineItemEntity>): String =
        withContext(Dispatchers.IO) {
            val settings = companySettingsRepository.getSettings()
            val templateId = settings?.documentTemplateId ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID
            val template = readTemplate(templateId)
            buildFromTemplate(template, settings, document, items)
        }

    suspend fun generatePdf(context: Context, document: DocumentEntity, items: List<LineItemEntity>) {
        val html = buildHtml(document, items)
        printHtml(context, html, "Documento_${document.number}")
    }

    fun printHtml(context: Context, html: String, jobName: String) {
        if (printing.get()) return
        mainHandler.post {
            if (printing.compareAndSet(false, true)) {
                startPrint(context.applicationContext, html, jobName)
            }
        }
    }

    suspend fun savePdfToFile(context: Context, html: String, fileName: String): Uri? {
        return withContext(Dispatchers.IO) {
            val pdfBytes = renderHtmlToPdf(html) ?: return@withContext null
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveViaMediaStore(context, pdfBytes, fileName)
            } else {
                saveViaFile(context, pdfBytes, fileName)
            }
        }
    }

    suspend fun sharePdf(context: Context, html: String, fileName: String): Uri? {
        return withContext(Dispatchers.IO) {
            val pdfBytes = renderHtmlToPdf(html) ?: return@withContext null
            val cacheDir = File(context.cacheDir, "shared_pdfs")
            cacheDir.mkdirs()
            val file = File(cacheDir, "$fileName.pdf")
            file.writeBytes(pdfBytes)
            val authority = "${context.packageName}.fileprovider"
            androidx.core.content.FileProvider.getUriForFile(context, authority, file)
        }
    }

    private suspend fun renderHtmlToPdf(html: String): ByteArray? = suspendCancellableCoroutine { cont ->
        mainHandler.post {
            val webView = WebView(appContext)
            webView.setBackgroundColor(Color.TRANSPARENT)
            webView.settings.javaScriptEnabled = false
            webView.settings.allowFileAccess = false
            webView.settings.defaultTextEncodingName = "UTF-8"
            val attrs = PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                .build()
            val dpi = attrs.resolution?.horizontalDpi?.toFloat() ?: 96f
            val w = attrs.mediaSize?.widthMils?.div(1000f) ?: 8.27f
            webView.layout(0, 0, (w * dpi).toInt(), (w * dpi * 1.4f).toInt())
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    val adapter = webView.createPrintDocumentAdapter("pdf_render")
                    adapter.onLayout(attrs, attrs, null, object : PrintDocumentAdapter.LayoutResultCallback() {
                        override fun onLayoutFinished(info: android.print.PrintDocumentInfo?, changed: Boolean) {
                            val buf = java.io.ByteArrayOutputStream()
                            val pfd = ParcelFileDescriptor.createPipe()
                            val readSide = ParcelFileDescriptor.AutoCloseInputStream(pfd)
                            adapter.onWrite(
                                arrayOf(PageRange.ALL_PAGES),
                                pfd,
                                CancellationSignal(),
                                object : PrintDocumentAdapter.WriteResultCallback() {
                                    override fun onWriteFinished(pages: Array<out PageRange>?) {
                                        val bytes = readSide.readBytes()
                                        readSide.close()
                                        webView.destroy()
                                        if (cont.isActive) cont.resume(bytes)
                                    }
                                    override fun onWriteFailed(error: CharSequence?) {
                                        webView.destroy()
                                        if (cont.isActive) cont.resume(null)
                                    }
                                },
                            )
                        }
                        override fun onLayoutFailed(error: CharSequence?) {
                            webView.destroy()
                            if (cont.isActive) cont.resume(null)
                        }
                    }, null)
                }
            }
            webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
            cont.invokeOnCancellation { webView.destroy() }
        }
    }

    private fun saveViaMediaStore(context: Context, bytes: ByteArray, fileName: String): Uri? {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, "$fileName.pdf")
            put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/Biz-flow")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
        }
        val collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        val uri = resolver.insert(collection, values) ?: return null
        resolver.openOutputStream(uri)?.use { it.write(bytes) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        }
        return uri
    }

    private fun saveViaFile(context: Context, bytes: ByteArray, fileName: String): Uri? {
        val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "Biz-flow")
        dir.mkdirs()
        val file = File(dir, "$fileName.pdf")
        file.writeBytes(bytes)
        val authority = "${context.packageName}.fileprovider"
        return try {
            androidx.core.content.FileProvider.getUriForFile(context, authority, file)
        } catch (_: Exception) {
            Uri.fromFile(file)
        }
    }

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
    ): String {
        return template
            .replace("{{COMPANY_LOGO_HTML}}", logoHtml(settings?.logoPath?.takeIf { contentExists(it) }
                ?: document.companyLogo))
            .replace("{{COMPANY_NAME}}", html(document.companyName ?: ""))
            .replace("{{COMPANY_DETAILS}}", html(companyDetails(document)))
            .replace("{{DOC_TITLE}}", documentTitle(document.documentType))
            .replace("{{DOC_NUMBER}}", html(document.number))
            .replace("{{DOC_DATE}}", formatDate(document.date))
            .replace("{{CLIENT_NAME}}", html(document.clientName))
            .replace("{{CLIENT_DETAILS}}", html(clientDetails(document)))
            .replace("{{PAYMENT_METHOD_INFO}}", html(document.paymentMethod ?: "\u2014"))
            .replace("{{ITEMS_TABLE_ROWS}}", itemsTableRows(items, document.currency))
            .replace("{{SUBTOTAL}}", formatMoney(document.subtotal, document.currency))
            .replace("{{TAX_LABEL}}", "VAT (${(document.taxRate * 100).toInt()}%)")
            .replace("{{TAX_AMOUNT}}", formatMoney(document.taxAmount, document.currency))
            .replace("{{TOTAL_AMOUNT}}", formatMoney(document.total, document.currency))
            .replace("{{STATUS_SEAL_HTML}}", statusSealHtml(document.status))
            .replace("{{COMPANY_STAMP_HTML}}", companyStampHtml(settings?.stampPath, document.stampText))
            .replace("{{TERMS_AND_CONDITIONS}}", html(document.stampText ?: ""))
            .replace("{{SIGNATURE_HTML}}", signatureHtml(resolveSignature(document, settings)))
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

    private fun statusSealHtml(status: DocumentStatus): String {
        if (status == DocumentStatus.EMITIDO) return ""
        return "<div style=\"position:absolute; top:44%; left:50%; transform:translate(-50%,-50%) rotate(-20deg); " +
            "border:6px solid #C62828; color:#C62828; border-radius:14px; padding:10px 30px; " +
            "font-size:44px; font-weight:900; letter-spacing:8px; opacity:0.16;\">${status.name}</div>"
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

    private fun clientDetails(document: DocumentEntity): String {
        return buildList {
            document.clientLocation.takeIf { it.isNotBlank() }?.let { add(it) }
            document.clientNuit.takeIf { it.isNotBlank() }?.let { add("NUIT: $it") }
            document.clientContact.takeIf { it.isNotBlank() }?.let { add(it) }
            document.clientWhatsApp?.takeIf { it.isNotBlank() }?.let { add(it) }
        }.joinToString(" \u2022 ")
    }

    private fun itemsTableRows(items: List<LineItemEntity>, currency: String): String {
        return items.joinToString(separator = "\n      ") { item ->
            "<tr><td>${html(item.description)}</td>" +
                "<td style=\"text-align:right\">${formatMoney(item.unitPrice, currency)}</td>" +
                "<td style=\"text-align:right\">${formatQuantity(item.quantity)}</td>" +
                "<td style=\"text-align:right\">${formatMoney(item.total, currency)}</td></tr>"
        }
    }

    private fun documentTitle(type: DocumentType): String {
        return when (type) {
            DocumentType.FATURA -> "Factura"
            DocumentType.FATURA_RECIBO -> "Fatura Recibo"
            DocumentType.RECIBO -> "Recibo"
            DocumentType.ORCAMENTO -> "Cotação"
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
}