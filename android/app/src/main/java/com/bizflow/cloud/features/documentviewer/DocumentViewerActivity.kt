package com.bizflow.cloud.features.documentviewer

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import java.io.ByteArrayOutputStream

class DocumentViewerActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "DocViewer"
        private const val VIEWER_BASE = "file:///android_asset/documentviewer/"
        private const val MAX_FILE_SIZE = 25L * 1024 * 1024 // 25MB — ~90MB RAM pico
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    // Network request tracking
    private val networkRequests = mutableListOf<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Build UI programmatically (no layout XML needed for POC)
        val root = FrameLayout(this)
        progressBar = ProgressBar(this).apply {
            visibility = View.VISIBLE
        }
        webView = WebView(this).apply {
            visibility = View.INVISIBLE
        }
        root.addView(webView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        root.addView(progressBar, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = android.view.Gravity.CENTER
        })
        setContentView(root)

        setupWebView()
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            allowContentAccess = false
            allowFileAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            loadsImagesAutomatically = true
            blockNetworkImage = true
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = true
            displayZoomControls = false
            setSupportZoom(true)
            defaultTextEncodingName = "UTF-8"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                // Allow local assets only
                if (url.startsWith(VIEWER_BASE) || url.startsWith("file:///android_asset/")) {
                    return false
                }
                // Block blob: from navigation (but allow for pdf.js worker)
                if (url.startsWith("blob:") && request.isForMainFrame) {
                    Log.w(TAG, "BLOCKED blob: navigation: $url")
                    networkRequests.add("BLOCKED blob:nav $url")
                    return true
                }
                // Block everything else
                Log.w(TAG, "BLOCKED external URL: $url")
                networkRequests.add("BLOCKED url $url")
                return true
            }

            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val url = request.url.toString()
                // Allow local assets
                if (url.startsWith("file:///android_asset/") || url.startsWith("blob:")) {
                    return super.shouldInterceptRequest(view, request)
                }
                // Block external requests
                if (!url.startsWith("data:")) {
                    Log.w(TAG, "BLOCKED network request: ${request.method} $url")
                    networkRequests.add("BLOCKED net ${request.method} $url")
                    return WebResourceResponse("text/plain", "utf-8", "".byteInputStream())
                }
                return super.shouldInterceptRequest(view, request)
            }
        }
    }

    private fun handleIntent(intent: Intent?) {
        val uri = intent?.data ?: run {
            Log.e(TAG, "No URI provided")
            finish()
            return
        }

        val mimeType = intent.type
        val fileType = FileDetector.detect(this, uri, mimeType)
        Log.i(TAG, "Detected file type: ${fileType.label} (MIME: $mimeType)")

        if (fileType == DocumentType.UNKNOWN) {
            Log.e(TAG, "Unsupported file type")
            finish()
            return
        }

        // Copy file to memory (for POC - production should use streaming)
        val fileData = readFileToBytes(uri)
        if (fileData == null) {
            Log.e(TAG, "Failed to read file")
            finish()
            return
        }

        if (fileData.size > MAX_FILE_SIZE) {
            Log.e(TAG, "File too large: ${fileData.size} bytes")
            finish()
            return
        }

        val base64 = Base64.encodeToString(fileData, Base64.NO_WRAP)
        val fileName = getFileName(uri) ?: "document"

        Log.i(TAG, "File: $fileName, Size: ${fileData.size} bytes, Type: ${fileType.label}")

        // Load viewer HTML and pass data
        val viewerUrl = VIEWER_BASE + fileType.viewerHtml
        webView.loadUrl(viewerUrl)
        webView.postDelayed({
            val escapedFileName = fileName.replace("\\", "\\\\").replace("'", "\\'")
            val js = "javascript:${fileType.jsEntryPoint}('$base64', '$escapedFileName')"
            webView.evaluateJavascript(js, null)
            webView.visibility = View.VISIBLE
            progressBar.visibility = View.GONE
        }, 300) // Small delay to ensure page is loaded
    }

    private fun readFileToBytes(uri: Uri): ByteArray? {
        return try {
            contentResolver.openInputStream(uri)?.use { stream ->
                val buffer = ByteArrayOutputStream()
                val data = ByteArray(8192)
                var bytesRead: Int
                while (stream.read(data).also { bytesRead = it } != -1) {
                    buffer.write(data, 0, bytesRead)
                }
                buffer.toByteArray()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading file", e)
            null
        }
    }

    private fun getFileName(uri: Uri): String? {
        var name: String? = null
        if (uri.scheme == "content") {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0) name = cursor.getString(idx)
                }
            }
        }
        if (name == null) {
            name = uri.lastPathSegment
        }
        return name
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    fun getNetworkRequestLog(): List<String> = networkRequests.toList()
}
