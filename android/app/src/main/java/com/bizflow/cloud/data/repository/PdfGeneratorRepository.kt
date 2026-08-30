package com.bizflow.cloud.data.repository

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import com.bizflow.cloud.core.util.formatMoney
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.runBlocking

class PdfGeneratorRepository(
    private val companySettingsRepository: CompanySettingsRepository,
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val printing = AtomicBoolean(false)
    private var activeWebView: WebView? = null

    fun generatePdf(context: Context, document: DocumentEntity, items: List<LineItemEntity>) {
        if (printing.get()) return
        val templateId = runBlocking { companySettingsRepository.getDocumentTemplateId() }
        val html = buildHtml(context, templateId, document, items)
        mainHandler.post {
            if (printing.compareAndSet(false, true)) {
                startPrint(context.applicationContext, html, document)
            }
        }
    }

    private fun buildHtml(
        context: Context,
        templateId: String,
        document: DocumentEntity,
        items: List<LineItemEntity>,
    ): String {
        val raw = context.assets.open("templates/$templateId.html")
            .bufferedReader(Charsets.UTF_8)
            .use { it.readText() }
        return raw
            .replace("{{COMPANY_LOGO_HTML}}", logoHtml(document.companyLogo))
            .replace("{{COMPANY_NAME}}", html(document.companyName ?: ""))
            .replace("{{COMPANY_DETAILS}}", html(companyDetails(document)))
            .replace("{{DOC_TITLE}}", documentTitle(document.type))
            .replace("{{DOC_NUMBER}}", html(document.number))
            .replace("{{DOC_DATE}}", formatDate(document.date))
            .replace("{{CLIENT_NAME}}", html(document.clientName))
            .replace("{{CLIENT_DETAILS}}", html(clientDetails(document)))
            .replace("{{PAYMENT_METHOD_INFO}}", html(document.paymentMethod ?: "\u2014"))
            .replace("{{ITEMS_TABLE_ROWS}}", itemsTableRows(items, document.currency))
            .replace("{{SUBTOTAL}}", formatMoney(document.subtotal, document.currency))
            .replace("{{TAX_LABEL}}", "IVA (${(document.taxRate * 100).toInt()}%)")
            .replace("{{TAX_AMOUNT}}", formatMoney(document.taxAmount, document.currency))
            .replace("{{TOTAL_AMOUNT}}", formatMoney(document.total, document.currency))
            .replace("{{TERMS_AND_CONDITIONS}}", html(document.stampText ?: ""))
            .replace("{{SIGNATURE_HTML}}", signatureHtml(document.signatureData))
    }

    private fun companyDetails(document: DocumentEntity): String {
        return listOf(
            document.companyAddress,
            document.companyNuit,
            document.companyContact,
        ).filterNotNull().filter { it.isNotBlank() }.joinToString(" \u2022 ")
    }

    private fun clientDetails(document: DocumentEntity): String {
        return listOf(
            document.clientLocation,
            "NUIT: ${document.clientNuit}",
            document.clientContact,
            document.clientWhatsApp,
        ).filter { it.isNotBlank() }.joinToString(" \u2022 ")
    }

    private fun itemsTableRows(items: List<LineItemEntity>, currency: String): String {
        return items.joinToString(separator = "\n      ") { item ->
            "<tr><td>${html(item.description)}</td>" +
                "<td style=\"text-align:right\">${formatMoney(item.unitPrice, currency)}</td>" +
                "<td style=\"text-align:right\">${formatQuantity(item.quantity)}</td>" +
                "<td style=\"text-align:right\">${formatMoney(item.total, currency)}</td></tr>"
        }
    }

    private fun documentTitle(type: String): String {
        return when (type) {
            "FAT" -> "Factura"
            "FAT-REC" -> "Fatura Recibo"
            "REC" -> "Recibo"
            "COT" -> "Cotação"
            else -> "Documento"
        }
    }

    private fun logoHtml(logo: String?): String {
        if (logo.isNullOrBlank()) return ""
        return "<img src=\"$logo\" style=\"max-height:56px; max-width:160px; display:block;\">"
    }

    private fun signatureHtml(signatureData: String?): String {
        if (signatureData.isNullOrBlank()) return ""
        return "<img src=\"data:image/png;base64,$signatureData\" " +
            "style=\"max-height:46px; display:block; margin:0 auto;\">"
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

    private fun startPrint(context: Context, html: String, document: DocumentEntity) {
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
                val jobName = "Documento_${document.number}"
                val inner = webView.createPrintDocumentAdapter(jobName)
                val adapter = TrackedPrintDocumentAdapter(inner) {
                    webView.stopLoading()
                    webView.webChromeClient = null
                    webView.webViewClient = null
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
        override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes?, cancellationSignal: CancellationSignal?, callback: LayoutResultCallback?, extras: Bundle?) {
            inner.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras)
        }

        override fun onWrite(pages: Array<out PageRange>?, destination: ParcelFileDescriptor?, cancellationSignal: CancellationSignal?, callback: WriteResultCallback?) {
            inner.onWrite(pages, destination, cancellationSignal, callback)
        }

        override fun onFinish() {
            inner.onFinish()
            onFinished()
        }
    }
}