package com.bizflow.cloud.ui.screens

import android.webkit.WebView
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.SaveAlt
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.bizflow.cloud.R
import com.bizflow.cloud.core.util.PrintDiagnostic

@Composable
fun PdfPreviewDialog(
    html: String,
    jobName: String,
    onSave: () -> Unit,
    onShare: () -> Unit,
    onSaveAndPrint: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    var showDiagnostic by remember { mutableStateOf(false) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = jobName,
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = onSave) {
                        Icon(Icons.Filled.SaveAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(text = stringResource(R.string.editor_save_pdf))
                    }
                    TextButton(onClick = onShare) {
                        Icon(Icons.Filled.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(text = stringResource(R.string.editor_share))
                    }
                    TextButton(onClick = onSaveAndPrint) {
                        Icon(Icons.Filled.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(text = stringResource(R.string.editor_save_and_print))
                    }
                    IconButton(onClick = { showDiagnostic = true }) {
                        Icon(Icons.Filled.BugReport, contentDescription = "Diagnostic", modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.nav_back))
                    }
                }
                val webView = remember {
                    WebView(context).apply {
                        settings.javaScriptEnabled = false
                        settings.allowFileAccess = false
                    }
                }
                AndroidView(
                    factory = { webView },
                    update = { it.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null) },
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }

    if (showDiagnostic) {
        val log = PrintDiagnostic.getLog()
        val lastStep = PrintDiagnostic.lastReachedStep
        AlertDialog(
            onDismissRequest = { showDiagnostic = false },
            title = { Text("PDF Print Diagnostic") },
            text = {
                Column {
                    Text(
                        text = "LAST_REACHED_STEP=$lastStep",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    Text(
                        text = log.ifEmpty { "No events recorded yet.\nTap 'Save & Print' first." },
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                        ),
                        modifier = Modifier.verticalScroll(rememberScrollState()),
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = { showDiagnostic = false }) {
                    Text("Close")
                }
            },
        )
    }
}
