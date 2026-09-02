package com.bizflow.cloud.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bizflow.cloud.R
import com.bizflow.cloud.data.local.entity.TransactionEntity
import com.bizflow.cloud.ui.theme.ExpenseRose
import com.bizflow.cloud.ui.theme.IncomeGreen
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(
    modifier: Modifier = Modifier,
    autoOpenCreate: Boolean = false,
    viewModel: FinanceViewModel = viewModel(factory = FinanceViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var showCreateSheet by rememberSaveable { mutableStateOf(autoOpenCreate) }
    var deleteTarget by remember { mutableStateOf<TransactionEntity?>(null) }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(text = stringResource(R.string.nav_finance)) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateSheet = true }) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.finance_add_movement))
            }
        },
    ) { innerPadding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(innerPadding),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = stringResource(R.string.loading),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else if (state.transactions.isEmpty() && state.filterType == FinanceViewModel.FilterType.ALL && state.filterCategory == null) {
            FinanceEmptyState(
                modifier = Modifier.fillMaxSize().padding(innerPadding),
                onAddMovement = { showCreateSheet = true },
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(innerPadding),
                contentPadding = PaddingValues(bottom = 88.dp),
            ) {
                item {
                    PeriodSelector(
                        period = state.period,
                        onPrevious = { viewModel.setPreviousMonth() },
                        onNext = {
                            val cal = Calendar.getInstance().apply { timeInMillis = state.period.startMs }
                            cal.add(Calendar.MONTH, 1)
                            if (cal.timeInMillis <= System.currentTimeMillis()) {
                                val newStart = Calendar.getInstance().apply {
                                    timeInMillis = state.period.startMs
                                    add(Calendar.MONTH, 1)
                                }
                                val newEnd = Calendar.getInstance().apply {
                                    timeInMillis = state.period.endMs
                                    add(Calendar.MONTH, 1)
                                }
                                viewModel.setPeriod(
                                    FinanceViewModel.FinancePeriod(
                                        newStart.timeInMillis,
                                        newEnd.timeInMillis,
                                        SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(newEnd.time),
                                    ),
                                )
                            }
                        },
                        onCurrent = { viewModel.setCurrentMonth() },
                    )
                }

                item {
                    FinanceSummary(
                        balance = state.balance,
                        income = state.totalIncome,
                        expense = state.totalExpense,
                        documentIncome = state.documentIncome,
                        currency = state.currency,
                    )
                }

                item {
                    FinanceFilters(
                        filterType = state.filterType,
                        filterCategory = state.filterCategory,
                        categories = state.categoryExpenses.keys.toList(),
                        onFilterTypeChange = { viewModel.setFilter(it) },
                        onFilterCategoryChange = { viewModel.setFilterCategory(it) },
                    )
                }

                if (state.monthlyData.isNotEmpty()) {
                    item {
                        BarChartSection(
                            data = state.monthlyData,
                            currency = state.currency,
                        )
                    }
                }

                if (state.totalIncome > 0 || state.totalExpense > 0) {
                    item {
                        IncomeExpenseDonut(
                            income = state.totalIncome,
                            expense = state.totalExpense,
                            currency = state.currency,
                        )
                    }
                }

                if (state.categoryExpenses.isNotEmpty()) {
                    item {
                        CategoryDonut(
                            categoryExpenses = state.categoryExpenses,
                            totalExpense = state.totalExpense,
                            currency = state.currency,
                        )
                    }
                }

                if (state.transactions.isNotEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.finance_movements),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                    }
                    items(state.transactions, key = { it.id }) { transaction ->
                        TransactionRow(
                            transaction = transaction,
                            currency = state.currency,
                            onDelete = { deleteTarget = transaction },
                        )
                    }
                }
            }
        }
    }

    if (showCreateSheet) {
        CreateTransactionSheet(
            currency = state.currency,
            onDismiss = { showCreateSheet = false },
            onConfirm = { type, amount, desc, cat, date ->
                viewModel.createTransaction(type, amount, desc, cat, date) {
                    showCreateSheet = false
                }
            },
        )
    }

    deleteTarget?.let { tx ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text(text = stringResource(R.string.delete)) },
            text = { Text(text = stringResource(R.string.finance_delete_confirm, tx.description)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteTransaction(tx.id)
                    deleteTarget = null
                }) { Text(text = stringResource(R.string.delete)) }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) {
                    Text(text = stringResource(R.string.cancel))
                }
            },
        )
    }
}

@Composable
private fun FinanceEmptyState(
    modifier: Modifier = Modifier,
    onAddMovement: () -> Unit = {},
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = stringResource(R.string.finance_empty_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.finance_empty_body),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp),
        )
        Spacer(modifier = Modifier.height(16.dp))
        TextButton(onClick = onAddMovement) {
            Text(text = stringResource(R.string.finance_add_movement))
        }
    }
}

@Composable
private fun PeriodSelector(
    period: FinanceViewModel.FinancePeriod,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onCurrent: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        IconButton(onClick = onPrevious) {
            Icon(Icons.Filled.ArrowBack, contentDescription = null)
        }
        TextButton(onClick = onCurrent) {
            Text(
                text = period.label.replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
        }
        IconButton(onClick = onNext) {
            Icon(Icons.Filled.ArrowForward, contentDescription = null)
        }
    }
}

@Composable
private fun FinanceSummary(
    balance: Double,
    income: Double,
    expense: Double,
    documentIncome: Double,
    currency: String,
) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = stringResource(R.string.finance_balance),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                Text(
                    text = formatMoney(balance, currency),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                Text(
                    text = stringResource(R.string.finance_income_expense_format, formatMoney(income, currency), formatMoney(expense, currency)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SummaryMiniCard(
                title = stringResource(R.string.finance_income),
                value = formatMoney(income, currency),
                color = IncomeGreen,
                modifier = Modifier.weight(1f),
            )
            SummaryMiniCard(
                title = stringResource(R.string.finance_expense),
                value = formatMoney(expense, currency),
                color = ExpenseRose,
                modifier = Modifier.weight(1f),
            )
        }
        if (documentIncome > 0) {
            Spacer(modifier = Modifier.height(8.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = IncomeGreen.copy(alpha = 0.1f),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = stringResource(R.string.finance_received_from_documents, formatMoney(documentIncome, currency)),
                    style = MaterialTheme.typography.bodySmall,
                    color = IncomeGreen,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                )
            }
        }
    }
}

@Composable
private fun SummaryMiniCard(
    title: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = color.copy(alpha = 0.1f),
        modifier = modifier,
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = title, style = MaterialTheme.typography.labelSmall, color = color)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = color,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun FinanceFilters(
    filterType: FinanceViewModel.FilterType,
    filterCategory: String?,
    categories: List<String>,
    onFilterTypeChange: (FinanceViewModel.FilterType) -> Unit,
    onFilterCategoryChange: (String?) -> Unit,
) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = filterType == FinanceViewModel.FilterType.ALL,
                onClick = { onFilterTypeChange(FinanceViewModel.FilterType.ALL) },
                label = { Text(stringResource(R.string.finance_filter_all)) },
            )
            FilterChip(
                selected = filterType == FinanceViewModel.FilterType.INCOME,
                onClick = { onFilterTypeChange(FinanceViewModel.FilterType.INCOME) },
                label = { Text(stringResource(R.string.finance_income)) },
            )
            FilterChip(
                selected = filterType == FinanceViewModel.FilterType.EXPENSE,
                onClick = { onFilterTypeChange(FinanceViewModel.FilterType.EXPENSE) },
                label = { Text(stringResource(R.string.finance_expense)) },
            )
        }
        if (categories.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                FilterChip(
                    selected = filterCategory == null,
                    onClick = { onFilterCategoryChange(null) },
                    label = { Text(stringResource(R.string.finance_filter_all_categories)) },
                )
                categories.take(3).forEach { cat ->
                    FilterChip(
                        selected = filterCategory == cat,
                        onClick = { onFilterCategoryChange(if (filterCategory == cat) null else cat) },
                        label = { Text(cat, maxLines = 1) },
                    )
                }
            }
        }
    }
}

@Composable
private fun BarChartSection(
    data: List<FinanceViewModel.MonthData>,
    currency: String,
) {
    val maxVal = data.maxOf { maxOf(it.income, it.expense) }.coerceAtLeast(1.0)
    val incomeColor = IncomeGreen
    val expenseColor = ExpenseRose

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = stringResource(R.string.finance_evolution),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom,
        ) {
            data.forEach { month ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.weight(1f),
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                        verticalAlignment = Alignment.Bottom,
                        modifier = Modifier.height(100.dp),
                    ) {
                        val incomeHeight by animateFloatAsState(
                            targetValue = (month.income / maxVal).toFloat(),
                            animationSpec = tween(600),
                        )
                        val expenseHeight by animateFloatAsState(
                            targetValue = (month.expense / maxVal).toFloat(),
                            animationSpec = tween(600),
                        )
                        Box(
                            modifier = Modifier
                                .width(10.dp)
                                .height((incomeHeight * 100).dp)
                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                .background(incomeColor),
                        )
                        Box(
                            modifier = Modifier
                                .width(10.dp)
                                .height((expenseHeight * 100).dp)
                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                .background(expenseColor),
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = month.label.take(3),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            LegendDot(color = incomeColor, label = stringResource(R.string.finance_income))
            LegendDot(color = expenseColor, label = stringResource(R.string.finance_expense))
        }
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(color),
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun IncomeExpenseDonut(
    income: Double,
    expense: Double,
    currency: String,
) {
    val total = income + expense
    val incomeRatio = if (total > 0) (income / total).toFloat() else 0.5f
    val animatedRatio by animateFloatAsState(targetValue = incomeRatio, animationSpec = tween(800))
    var selectedIncome by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.finance_income_vs_expense),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Box(contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.size(160.dp)) {
                val stroke = 32f
                val radius = (size.minDimension - stroke) / 2
                val topLeft = Offset(stroke / 2, stroke / 2)

                drawArc(
                    color = IncomeGreen,
                    startAngle = -90f,
                    sweepAngle = 360f * animatedRatio,
                    useCenter = false,
                    topLeft = topLeft,
                    size = Size(radius * 2, radius * 2),
                    style = Stroke(width = stroke),
                )
                drawArc(
                    color = ExpenseRose,
                    startAngle = -90f + 360f * animatedRatio,
                    sweepAngle = 360f * (1f - animatedRatio),
                    useCenter = false,
                    topLeft = topLeft,
                    size = Size(radius * 2, radius * 2),
                    style = Stroke(width = stroke),
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = if (selectedIncome) formatMoney(income, currency) else formatMoney(expense, currency),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = if (selectedIncome) stringResource(R.string.finance_income) else stringResource(R.string.finance_expense),
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(IncomeGreen.copy(alpha = if (selectedIncome) 0.2f else 0f))
                    .clickable { selectedIncome = true }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    text = "${stringResource(R.string.finance_income)}: ${if (total > 0) String.format(Locale.US, "%.0f", incomeRatio * 100) else "0"}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = IncomeGreen,
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(ExpenseRose.copy(alpha = if (!selectedIncome) 0.2f else 0f))
                    .clickable { selectedIncome = false }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    text = "${stringResource(R.string.finance_expense)}: ${if (total > 0) String.format(Locale.US, "%.0f", (1 - incomeRatio) * 100) else "0"}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = ExpenseRose,
                )
            }
        }
    }
}

private val chartColors = listOf(
    Color(0xFF8B5CF6), Color(0xFFF97316), Color(0xFF06B6D4),
    Color(0xFFEAB308), Color(0xFFEC4899), Color(0xFF22C55E),
    Color(0xFF3B82F6), Color(0xFFEF4444), Color(0xFF14B8A6),
    Color(0xFFA855F7),
)

@Composable
private fun CategoryDonut(
    categoryExpenses: Map<String, Double>,
    totalExpense: Double,
    currency: String,
) {
    val sorted = categoryExpenses.entries.sortedByDescending { it.value }
    var selectedCategory by remember { mutableStateOf(sorted.firstOrNull()?.key) }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = stringResource(R.string.finance_expenses_by_category),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(140.dp)) {
                Canvas(modifier = Modifier.size(140.dp)) {
                    val stroke = 28f
                    val radius = (size.minDimension - stroke) / 2
                    val topLeft = Offset(stroke / 2, stroke / 2)
                    var startAngle = -90f
                    sorted.forEachIndexed { index, entry ->
                        val sweep = if (totalExpense > 0) (entry.value / totalExpense * 360f).toFloat() else 0f
                        drawArc(
                            color = chartColors[index % chartColors.size],
                            startAngle = startAngle,
                            sweepAngle = sweep,
                            useCenter = false,
                            topLeft = topLeft,
                            size = Size(radius * 2, radius * 2),
                            style = Stroke(width = stroke),
                        )
                        startAngle += sweep
                    }
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val selValue = sorted.find { it.key == selectedCategory }?.value ?: 0.0
                    Text(
                        text = formatMoney(selValue, currency),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                sorted.forEachIndexed { index, entry ->
                    val pct = if (totalExpense > 0) entry.value / totalExpense * 100 else 0.0
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedCategory = entry.key }
                            .padding(vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(chartColors[index % chartColors.size]),
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = entry.key,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = String.format(Locale.US, "%.0f%%", pct),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransactionRow(
    transaction: TransactionEntity,
    currency: String,
    onDelete: () -> Unit,
) {
    val isIncome = transaction.type == FinanceViewModel.TYPE_INCOME
    val color = if (isIncome) IncomeGreen else ExpenseRose
    val icon = if (isIncome) "+" else "−"
    val dateText = try {
        val sdf = SimpleDateFormat("dd MMM", Locale.getDefault())
        sdf.format(Date(transaction.timestamp))
    } catch (_: Exception) { transaction.date }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = icon,
                    color = color,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = transaction.description,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Row {
                    Text(
                        text = transaction.category,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (transaction.documentId != null) {
                        Text(
                            text = " • ${stringResource(R.string.finance_document)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = IncomeGreen,
                        )
                    }
                    Text(
                        text = " • $dateText",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "$icon ${formatMoney(transaction.amount, transaction.currency.ifBlank { currency })}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = color,
                )
                IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = stringResource(R.string.delete),
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.6f),
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateTransactionSheet(
    currency: String,
    onDismiss: () -> Unit,
    onConfirm: (type: String, amount: Double, description: String, category: String, date: String) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState()
    var type by rememberSaveable { mutableStateOf(FinanceViewModel.TYPE_EXPENSE) }
    var amountText by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf(FinanceViewModel.DEFAULT_CATEGORIES) }
    var dateText by rememberSaveable {
        mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
    }
    var showDatePicker by rememberSaveable { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val isIncome = type == FinanceViewModel.TYPE_INCOME
    val typeColor = if (isIncome) IncomeGreen else ExpenseRose

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(
                text = stringResource(R.string.finance_add_movement),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(16.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FilterChip(
                    selected = type == FinanceViewModel.TYPE_INCOME,
                    onClick = { type = FinanceViewModel.TYPE_INCOME },
                    label = { Text(stringResource(R.string.finance_income)) },
                )
                FilterChip(
                    selected = type == FinanceViewModel.TYPE_EXPENSE,
                    onClick = { type = FinanceViewModel.TYPE_EXPENSE },
                    label = { Text(stringResource(R.string.finance_expense)) },
                )
            }
            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = amountText,
                onValueChange = { amountText = it.filter { c -> c.isDigit() || c == '.' } },
                label = { Text(stringResource(R.string.finance_amount)) },
                prefix = { Text("$currency ") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text(stringResource(R.string.finance_description)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = stringResource(R.string.finance_category),
                style = MaterialTheme.typography.labelMedium,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                FinanceViewModel.FINANCE_CATEGORIES.take(5).forEach { cat ->
                    FilterChip(
                        selected = category == cat,
                        onClick = { category = cat },
                        label = { Text(cat, fontSize = 11.sp) },
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = dateText,
                onValueChange = { dateText = it },
                label = { Text(stringResource(R.string.finance_date)) },
                trailingIcon = {
                    IconButton(onClick = { showDatePicker = true }) {
                        Icon(Icons.Filled.DateRange, contentDescription = null)
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(20.dp))

            val amount = amountText.toDoubleOrNull()
            val isValid = amount != null && amount > 0 && description.isNotBlank()

            TextButton(
                onClick = {
                    if (isValid) {
                        onConfirm(type, amount, description, category, dateText)
                    }
                },
                enabled = isValid,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
            ) {
                Text(
                    text = stringResource(R.string.finance_save_movement),
                    color = if (isValid) typeColor else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = try {
                SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dateText)?.time
            } catch (_: Exception) { System.currentTimeMillis() },
        )
        AlertDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        dateText = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(millis))
                    }
                    showDatePicker = false
                }) { Text(stringResource(R.string.ok)) }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
            text = {
                androidx.compose.material3.DatePicker(
                    state = datePickerState,
                    title = null,
                    headline = null,
                    showModeToggle = false,
                )
            },
        )
    }
}
