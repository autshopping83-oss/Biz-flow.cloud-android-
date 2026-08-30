package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bizflow.cloud.R
import com.bizflow.cloud.data.local.model.DocumentWithItems
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(
    modifier: Modifier = Modifier,
    viewModel: DocumentsViewModel = viewModel(factory = DocumentsViewModel.Factory),
) {
    val documents by viewModel.documents.collectAsStateWithLifecycle()

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(text = stringResource(R.string.nav_documents)) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* Fase 6: criar novo documento */ }) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = stringResource(R.string.fab_add_document),
                )
            }
        },
    ) { innerPadding ->
        if (documents.isEmpty()) {
            DocumentsEmptyState(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            )
        } else {
            DocumentList(
                documents = documents,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            )
        }
    }
}

@Composable
private fun DocumentsEmptyState(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(24.dp),
        ) {
            Icon(
                imageVector = Icons.Outlined.Description,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(56.dp),
            )
            Text(
                text = stringResource(R.string.documents_empty_title),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = stringResource(R.string.documents_empty_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun DocumentList(
    documents: List<DocumentWithItems>,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(documents, key = { it.document.id }) { item ->
            DocumentCard(document = item.document)
        }
    }
}

fun formatMoney(amount: Double, currency: String): String {
    val formatted = String.format(Locale.US, "%,.2f", amount).replace(',', ' ')
    return "$formatted $currency"
}

fun formatDate(date: String): String {
    return try {
        val parsed = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .parse(date)
        if (parsed == null) {
            date
        } else {
            SimpleDateFormat("dd/MM/yyyy", Locale.US)
                .apply { timeZone = TimeZone.getTimeZone("UTC") }
                .format(parsed)
        }
    } catch (_: Exception) {
        date
    }
}

data class TypeStyle(val label: String, val container: Color)

@Composable
fun typeStyle(type: String): TypeStyle {
    val container = when (type) {
        "INVOICE" -> MaterialTheme.colorScheme.primaryContainer
        "INVOICE_RECEIPT" -> MaterialTheme.colorScheme.secondaryContainer
        "QUOTE" -> MaterialTheme.colorScheme.tertiaryContainer
        "RECEIPT" -> MaterialTheme.colorScheme.tertiaryContainer
        else -> MaterialTheme.colorScheme.surfaceContainerHighest
    }
    val label = when (type) {
        "INVOICE" -> "FAT"
        "INVOICE_RECEIPT" -> "FAT-REC"
        "QUOTE" -> "COT"
        "RECEIPT" -> "REC"
        else -> type.take(3).uppercase()
    }
    return TypeStyle(label, container)
}

data class StatusStyle(val labelRes: Int, val container: Color)

@Composable
fun statusStyle(status: String): StatusStyle {
    return when (status) {
        "PAID" -> StatusStyle(R.string.status_paid, MaterialTheme.colorScheme.primaryContainer)
        "OVERDUE" -> StatusStyle(R.string.status_overdue, MaterialTheme.colorScheme.errorContainer)
        "SENT" -> StatusStyle(R.string.status_sent, MaterialTheme.colorScheme.secondaryContainer)
        else -> StatusStyle(R.string.status_draft, MaterialTheme.colorScheme.surfaceContainerHighest)
    }
}