package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Paid
import androidx.compose.material.icons.filled.RequestQuote
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bizflow.cloud.R
import com.bizflow.cloud.data.model.CurrencyCatalog
import com.bizflow.cloud.data.model.DocumentType
import com.bizflow.cloud.ui.components.ActionCard
import com.bizflow.cloud.ui.components.QuickAccessChip
import com.bizflow.cloud.ui.components.RecentDocumentRow
import com.bizflow.cloud.ui.components.RevenueBadge
import com.bizflow.cloud.ui.theme.InvoiceBlue
import com.bizflow.cloud.ui.theme.InvoiceReceiptViolet
import com.bizflow.cloud.ui.theme.QuoteVioletDark
import com.bizflow.cloud.ui.theme.ReceiptEmerald

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    onCreateDocument: (DocumentType) -> Unit = {},
    onViewHistory: () -> Unit = {},
    viewModel: HomeViewModel = viewModel(factory = HomeViewModel.Factory),
) {
    val recentDocuments by viewModel.recentDocuments.collectAsStateWithLifecycle()
    val currency by viewModel.currency.collectAsStateWithLifecycle()
    val displayCurrency = currency.ifBlank { CurrencyCatalog.DEFAULT_CODE }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = stringResource(R.string.dashboard_title),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Text(
                            text = stringResource(R.string.dashboard_subtitle),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    RevenueBadge(
                        label = stringResource(R.string.monthly_revenue),
                        value = formatMoney(0.0, displayCurrency),
                        modifier = Modifier.padding(end = 12.dp),
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                QuickActionsSection(onCreateDocument = onCreateDocument)
            }
            item {
                QuickAccessSection()
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = stringResource(R.string.home_recent_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = stringResource(R.string.home_view_history),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clickable { onViewHistory() },
                        )
                    }
                    if (recentDocuments.isEmpty()) {
                        Text(
                            text = stringResource(R.string.home_recent_empty),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            items(recentDocuments, key = { it.document.id }) { item ->
                RecentDocumentRow(
                    document = item.document,
                    onClick = { /* Fase 6: abrir documento */ },
                )
            }
        }
    }
}

@Composable
private fun QuickActionsSection(onCreateDocument: (DocumentType) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ActionCard(
                title = stringResource(R.string.action_new_invoice),
                subtitle = stringResource(R.string.action_new_invoice_sub),
                containerColor = InvoiceBlue,
                leadingIcon = Icons.Filled.Description,
                onAdd = { onCreateDocument(DocumentType.FATURA) },
                onClick = { onCreateDocument(DocumentType.FATURA) },
                modifier = Modifier.weight(1f),
            )
            ActionCard(
                title = stringResource(R.string.action_new_receipt),
                subtitle = stringResource(R.string.action_new_receipt_sub),
                containerColor = ReceiptEmerald,
                leadingIcon = Icons.Filled.Paid,
                onAdd = { onCreateDocument(DocumentType.RECIBO) },
                onClick = { onCreateDocument(DocumentType.RECIBO) },
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ActionCard(
                title = stringResource(R.string.action_invoice_receipt),
                subtitle = stringResource(R.string.action_invoice_receipt_sub),
                containerColor = InvoiceReceiptViolet,
                leadingIcon = Icons.Filled.RequestQuote,
                onAdd = { onCreateDocument(DocumentType.FATURA_RECIBO) },
                onClick = { onCreateDocument(DocumentType.FATURA_RECIBO) },
                modifier = Modifier.weight(1f),
            )
            ActionCard(
                title = stringResource(R.string.action_new_quote),
                subtitle = stringResource(R.string.action_new_quote_sub),
                containerColor = QuoteVioletDark,
                leadingIcon = Icons.Filled.RequestQuote,
                onAdd = { onCreateDocument(DocumentType.ORCAMENTO) },
                onClick = { onCreateDocument(DocumentType.ORCAMENTO) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun QuickAccessSection() {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        QuickAccessChip(
            label = stringResource(R.string.home_quick_expense),
            icon = Icons.Filled.AccountBalanceWallet,
            onClick = { /* Fase 6: nova despesa */ },
            modifier = Modifier.weight(1f),
        )
        QuickAccessChip(
            label = stringResource(R.string.home_quick_reports),
            icon = Icons.Filled.Assessment,
            onClick = { /* Fase 6: relatorios */ },
            modifier = Modifier.weight(1f),
        )
    }
}