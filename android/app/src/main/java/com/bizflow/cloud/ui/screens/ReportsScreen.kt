package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Money
import androidx.compose.material.icons.filled.Pending
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bizflow.cloud.R
import com.bizflow.cloud.core.util.formatMoney
import com.bizflow.cloud.data.local.model.ProductAggregation
import com.bizflow.cloud.data.model.CurrencyCatalog
import com.bizflow.cloud.data.model.DocumentType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    modifier: Modifier = Modifier,
    onBack: () -> Unit = {},
    viewModel: ReportsViewModel = viewModel(factory = ReportsViewModel.Factory),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val displayCurrency = uiState.selectedCurrency ?: uiState.settingsCurrency

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.reports_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.nav_back),
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
    ) { innerPadding ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = stringResource(R.string.loading),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            item {
                ReportPeriodSelector(
                    period = uiState.period,
                    onPrevious = viewModel::setPreviousMonth,
                    onNext = viewModel::setNextMonth,
                    onCurrent = viewModel::setCurrentMonth,
                )
            }
            item {
                ReportCurrencyFilter(
                    selectedCurrency = uiState.selectedCurrency,
                    settingsCurrency = uiState.settingsCurrency,
                    onSelect = viewModel::setCurrency,
                )
            }
            item {
                ReportTabRow(
                    selectedTab = uiState.selectedTab,
                    onSelectTab = viewModel::setTab,
                )
            }
            item {
                when (uiState.selectedTab) {
                    ReportsViewModel.ReportTab.SALES -> SalesReport(
                        sales = uiState.sales,
                        currency = displayCurrency,
                        isFiltered = uiState.selectedCurrency != null,
                    )
                    ReportsViewModel.ReportTab.DOCUMENTS -> DocumentsReport(
                        documents = uiState.documents,
                        isFiltered = uiState.selectedCurrency != null,
                    )
                    ReportsViewModel.ReportTab.PRODUCTS -> ProductsReport(
                        products = uiState.products,
                        currency = displayCurrency,
                        isFiltered = uiState.selectedCurrency != null,
                    )
                    ReportsViewModel.ReportTab.CLIENTS -> ClientsReport(
                        clients = uiState.clients,
                        currency = displayCurrency,
                        isFiltered = uiState.selectedCurrency != null,
                    )
                }
            }
        }
    }
}

@Composable
private fun ReportPeriodSelector(
    period: ReportsViewModel.ReportPeriod,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onCurrent: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onPrevious) {
            Text("<", style = MaterialTheme.typography.titleLarge)
        }
        Text(
            text = period.label,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
        IconButton(onClick = onNext) {
            Text(">", style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun ReportCurrencyFilter(
    selectedCurrency: String?,
    settingsCurrency: String,
    onSelect: (String?) -> Unit,
) {
    var searchQuery by remember { mutableStateOf("") }
    val allCurrencies = CurrencyCatalog.ALL.map { it.code }
    val filteredCurrencies = if (searchQuery.isBlank()) {
        allCurrencies
    } else {
        allCurrencies.filter { it.contains(searchQuery.trim(), ignoreCase = true) }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            placeholder = { Text(stringResource(R.string.reports_search_currency)) },
            singleLine = true,
            textStyle = MaterialTheme.typography.bodySmall,
        )
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                FilterChip(
                    selected = selectedCurrency == null,
                    onClick = { onSelect(null) },
                    label = { Text(stringResource(R.string.finance_filter_all)) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                )
            }
            items(filteredCurrencies) { code ->
                FilterChip(
                    selected = selectedCurrency == code,
                    onClick = { onSelect(code) },
                    label = { Text(code) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                )
            }
        }
    }
}

@Composable
private fun ReportTabRow(
    selectedTab: ReportsViewModel.ReportTab,
    onSelectTab: (ReportsViewModel.ReportTab) -> Unit,
) {
    val tabs = listOf(
        ReportsViewModel.ReportTab.SALES to Pair(stringResource(R.string.reports_tab_sales), Icons.Filled.Money),
        ReportsViewModel.ReportTab.DOCUMENTS to Pair(stringResource(R.string.reports_tab_documents), Icons.Filled.Description),
        ReportsViewModel.ReportTab.PRODUCTS to Pair(stringResource(R.string.reports_tab_products), Icons.Filled.Inventory),
        ReportsViewModel.ReportTab.CLIENTS to Pair(stringResource(R.string.reports_tab_clients), Icons.Filled.People),
    )

    ScrollableTabRow(
        selectedTabIndex = tabs.indexOfFirst { it.first == selectedTab },
        modifier = Modifier.fillMaxWidth(),
        edgePadding = 16.dp,
    ) {
        tabs.forEach { (tab, tabInfo) ->
            val (label, icon) = tabInfo
            Tab(
                selected = selectedTab == tab,
                onClick = { onSelectTab(tab) },
                text = { Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                icon = { Icon(icon, contentDescription = label, modifier = Modifier.size(18.dp)) },
            )
        }
    }
}

@Composable
private fun ReportCard(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun ReportMetricRow(
    label: String,
    value: String,
    icon: ImageVector? = null,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = valueColor,
        )
    }
}

@Composable
private fun ReportMetricRow(
    label: String,
    value: Int,
    icon: ImageVector? = null,
) {
    ReportMetricRow(label = label, value = value.toString(), icon = icon)
}

@Composable
private fun SalesReport(
    sales: ReportsViewModel.SalesMetrics,
    currency: String,
    isFiltered: Boolean,
) {
    if (sales.salesCount == 0 && sales.totalSales == 0.0) {
        val message = if (isFiltered) {
            stringResource(R.string.reports_empty_sales_filtered, currency)
        } else {
            stringResource(R.string.reports_empty_sales)
        }
        EmptyReportState(message = message)
        return
    }

    ReportCard(title = stringResource(R.string.reports_sales_summary)) {
        ReportMetricRow(
            label = stringResource(R.string.reports_total_sales),
            value = formatMoney(sales.totalSales, currency),
            icon = Icons.Filled.Money,
        )
        ReportMetricRow(
            label = stringResource(R.string.reports_sales_count),
            value = sales.salesCount,
            icon = Icons.Filled.Receipt,
        )
        ReportMetricRow(
            label = stringResource(R.string.reports_average_ticket),
            value = formatMoney(sales.averageTicket, currency),
            icon = Icons.AutoMirrored.Filled.TrendingUp,
        )
    }

    if (sales.salesByType.isNotEmpty()) {
        ReportCard(title = stringResource(R.string.reports_sales_by_type)) {
            sales.salesByType.forEach { (typeCode, amount) ->
                val typeName = DocumentType.fromCode(typeCode).let {
                    when (it) {
                        DocumentType.FATURA -> stringResource(R.string.document_type_invoice)
                        DocumentType.FATURA_RECIBO -> stringResource(R.string.document_type_invoice_receipt)
                        DocumentType.RECIBO -> stringResource(R.string.document_type_receipt)
                        DocumentType.ORCAMENTO -> stringResource(R.string.document_type_quote)
                    }
                }
                ReportMetricRow(
                    label = typeName,
                    value = formatMoney(amount, currency),
                    icon = when (DocumentType.fromCode(typeCode)) {
                        DocumentType.FATURA -> Icons.Filled.Description
                        DocumentType.FATURA_RECIBO -> Icons.Filled.Receipt
                        DocumentType.RECIBO -> Icons.Filled.CheckCircle
                        DocumentType.ORCAMENTO -> Icons.Filled.Pending
                    },
                )
            }
        }
    }
}

@Composable
private fun DocumentsReport(
    documents: ReportsViewModel.DocumentMetrics,
    isFiltered: Boolean,
) {
    if (documents.totalCount == 0) {
        val message = if (isFiltered) {
            stringResource(R.string.reports_empty_documents_filtered, "")
        } else {
            stringResource(R.string.reports_empty_documents)
        }
        EmptyReportState(message = message)
        return
    }

    ReportCard(title = stringResource(R.string.reports_documents_summary)) {
        ReportMetricRow(
            label = stringResource(R.string.reports_total_documents),
            value = documents.totalCount.toString(),
            icon = Icons.Filled.Description,
        )
        ReportMetricRow(
            label = stringResource(R.string.reports_documents_paid),
            value = documents.paidCount.toString(),
            icon = Icons.Filled.CheckCircle,
            valueColor = Color(0xFF4CAF50),
        )
        ReportMetricRow(
            label = stringResource(R.string.reports_documents_issued),
            value = documents.issuedCount.toString(),
            icon = Icons.Filled.Send,
        )
        ReportMetricRow(
            label = stringResource(R.string.reports_documents_pending),
            value = documents.pendingCount.toString(),
            icon = Icons.Filled.Pending,
            valueColor = Color(0xFFFF9800),
        )
        ReportMetricRow(
            label = stringResource(R.string.reports_documents_cancelled),
            value = documents.cancelledCount.toString(),
            icon = Icons.Filled.Close,
            valueColor = Color(0xFFF44336),
        )
    }

    if (documents.countByType.isNotEmpty()) {
        ReportCard(title = stringResource(R.string.reports_documents_by_type)) {
            documents.countByType.forEach { (typeCode, count) ->
                val typeName = DocumentType.fromCode(typeCode).let {
                    when (it) {
                        DocumentType.FATURA -> stringResource(R.string.document_type_invoice)
                        DocumentType.FATURA_RECIBO -> stringResource(R.string.document_type_invoice_receipt)
                        DocumentType.RECIBO -> stringResource(R.string.document_type_receipt)
                        DocumentType.ORCAMENTO -> stringResource(R.string.document_type_quote)
                    }
                }
                ReportMetricRow(
                    label = typeName,
                    value = count,
                    icon = when (DocumentType.fromCode(typeCode)) {
                        DocumentType.FATURA -> Icons.Filled.Description
                        DocumentType.FATURA_RECIBO -> Icons.Filled.Receipt
                        DocumentType.RECIBO -> Icons.Filled.CheckCircle
                        DocumentType.ORCAMENTO -> Icons.Filled.Pending
                    },
                )
            }
        }
    }
}

@Composable
private fun ProductsReport(
    products: ReportsViewModel.ProductMetrics,
    currency: String,
    isFiltered: Boolean,
) {
    if (products.topByRevenue.isEmpty() && products.topByQuantity.isEmpty()) {
        val message = if (isFiltered) {
            stringResource(R.string.reports_empty_products_filtered, currency)
        } else {
            stringResource(R.string.reports_empty_products)
        }
        EmptyReportState(message = message)
        return
    }

    if (products.topByRevenue.isNotEmpty()) {
        ReportCard(title = stringResource(R.string.reports_top_products_revenue)) {
            products.topByRevenue.forEachIndexed { index, product ->
                ProductRankingRow(
                    rank = index + 1,
                    product = product,
                    currency = currency,
                )
            }
        }
    }

    if (products.topByQuantity.isNotEmpty()) {
        ReportCard(title = stringResource(R.string.reports_top_products_quantity)) {
            products.topByQuantity.forEachIndexed { index, product ->
                ProductRankingRow(
                    rank = index + 1,
                    product = product,
                    currency = currency,
                    showQuantity = true,
                )
            }
        }
    }
}

@Composable
private fun ProductRankingRow(
    rank: Int,
    product: ProductAggregation,
    currency: String,
    showQuantity: Boolean = false,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "$rank.",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.width(28.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = product.description,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (showQuantity) {
                Text(
                    text = stringResource(R.string.reports_quantity_format, product.quantity.toInt()),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Text(
                    text = formatMoney(product.unitPrice, currency) + " / u",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            text = if (showQuantity) {
                "${product.quantity.toInt()} u"
            } else {
                formatMoney(product.total, currency)
            },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun ClientsReport(
    clients: List<ReportsViewModel.ClientRanking>,
    currency: String,
    isFiltered: Boolean,
) {
    if (clients.isEmpty()) {
        val message = if (isFiltered) {
            stringResource(R.string.reports_empty_clients_filtered, currency)
        } else {
            stringResource(R.string.reports_empty_clients)
        }
        EmptyReportState(message = message)
        return
    }

    ReportCard(title = stringResource(R.string.reports_top_clients)) {
        clients.forEachIndexed { index, client ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "${index + 1}.",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.width(28.dp),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = client.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = stringResource(R.string.reports_client_docs_format, client.documentCount),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = formatMoney(client.totalValue, currency),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            if (index < clients.lastIndex) {
                HorizontalDivider(modifier = Modifier.padding(start = 28.dp))
            }
        }
    }
}

@Composable
private fun EmptyReportState(message: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.Assessment,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
