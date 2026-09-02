package com.bizflow.cloud.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.TransactionEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.TransactionRepository
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class FinanceViewModel(
    private val transactionRepository: TransactionRepository,
    private val documentRepository: DocumentRepository,
    private val companySettingsRepository: CompanySettingsRepository,
) : ViewModel() {

    data class FinancePeriod(
        val startMs: Long,
        val endMs: Long,
        val label: String,
    )

    data class FinanceUiState(
        val period: FinancePeriod = currentMonthPeriod(),
        val totalIncome: Double = 0.0,
        val totalExpense: Double = 0.0,
        val balance: Double = 0.0,
        val documentIncome: Double = 0.0,
        val manualIncome: Double = 0.0,
        val manualExpense: Double = 0.0,
        val incomeCount: Int = 0,
        val expenseCount: Int = 0,
        val transactions: List<TransactionEntity> = emptyList(),
        val categoryExpenses: Map<String, Double> = emptyMap(),
        val monthlyData: List<MonthData> = emptyList(),
        val filterType: FilterType = FilterType.ALL,
        val filterCategory: String? = null,
        val currency: String = "MZN",
        val isLoading: Boolean = true,
    )

    data class MonthData(
        val label: String,
        val income: Double,
        val expense: Double,
    )

    enum class FilterType { ALL, INCOME, EXPENSE }

    private val _period = MutableStateFlow(currentMonthPeriod())
    private val _filterType = MutableStateFlow(FilterType.ALL)
    private val _filterCategory = MutableStateFlow<String?>(null)

    val uiState: StateFlow<FinanceUiState> = combine(
        _period,
        _filterType,
        _filterCategory,
        transactionRepository.observeAll(),
        companySettingsRepository.observeCurrency(),
    ) { period, filterType, filterCategory, allTransactions, currency ->
        val periodTransactions = allTransactions.filter {
            it.timestamp in period.startMs..period.endMs
        }

        val income = periodTransactions.filter { it.type == TYPE_INCOME }.sumOf { it.amount }
        val expense = periodTransactions.filter { it.type == TYPE_EXPENSE }.sumOf { it.amount }
        val docIncome = periodTransactions.filter {
            it.type == TYPE_INCOME && it.documentId != null
        }.sumOf { it.amount }
        val manualInc = periodTransactions.filter {
            it.type == TYPE_INCOME && it.documentId == null
        }.sumOf { it.amount }
        val manualExp = periodTransactions.filter {
            it.type == TYPE_EXPENSE && it.documentId == null
        }.sumOf { it.amount }

        val filtered = when (filterType) {
            FilterType.INCOME -> periodTransactions.filter { it.type == TYPE_INCOME }
            FilterType.EXPENSE -> periodTransactions.filter { it.type == TYPE_EXPENSE }
            FilterType.ALL -> periodTransactions
        }.let { list ->
            if (filterCategory != null) list.filter { it.category == filterCategory } else list
        }

        val catExpenses = periodTransactions
            .filter { it.type == TYPE_EXPENSE }
            .groupBy { it.category }
            .mapValues { (_, v) -> v.sumOf { it.amount } }

        val monthlyData = computeMonthlyData(allTransactions, period)

        FinanceUiState(
            period = period,
            totalIncome = income,
            totalExpense = expense,
            balance = income - expense,
            documentIncome = docIncome,
            manualIncome = manualInc,
            manualExpense = manualExp,
            incomeCount = periodTransactions.count { it.type == TYPE_INCOME },
            expenseCount = periodTransactions.count { it.type == TYPE_EXPENSE },
            transactions = filtered,
            categoryExpenses = catExpenses,
            monthlyData = monthlyData,
            filterType = filterType,
            filterCategory = filterCategory,
            currency = currency,
            isLoading = false,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = FinanceUiState(),
    )

    fun setPeriod(period: FinancePeriod) {
        _period.value = period
    }

    fun setFilter(type: FilterType) {
        _filterType.value = type
    }

    fun setFilterCategory(category: String?) {
        _filterCategory.value = category
    }

    fun setCurrentMonth() {
        _period.value = currentMonthPeriod()
    }

    fun setPreviousMonth() {
        _period.value = previousMonthPeriod()
    }

    fun setNextMonth() {
        val next = nextMonthPeriod()
        if (next.startMs <= System.currentTimeMillis()) {
            _period.value = next
        }
    }

    fun createTransaction(
        type: String,
        amount: Double,
        description: String,
        category: String,
        date: String,
        onDone: () -> Unit,
    ) {
        if (amount <= 0.0) return
        if (description.isBlank()) return

        viewModelScope.launch {
            val currency = companySettingsRepository.getCurrency()
            val timestamp = parseDateToTimestamp(date)
            val transaction = TransactionEntity(
                id = UUID.randomUUID().toString(),
                userId = null,
                type = type,
                amount = amount,
                description = description.trim(),
                category = category,
                date = date,
                timestamp = timestamp,
                receiptId = null,
                documentId = null,
                currency = currency,
                synced = false,
                updatedAt = System.currentTimeMillis(),
                deletedAt = null,
            )
            transactionRepository.save(transaction)
            onDone()
        }
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch { transactionRepository.softDelete(id) }
    }

    suspend fun createTransactionFromDocument(document: DocumentEntity) {
        val existing = transactionRepository.getByDocumentId(document.id)
        if (existing != null) return

        val timestamp = parseDateToTimestamp(document.date)
        val transaction = TransactionEntity(
            id = UUID.randomUUID().toString(),
            userId = null,
            type = TYPE_INCOME,
            amount = document.total,
            description = "Documento ${document.number} — ${document.clientName.ifBlank { "Sem cliente" }}",
            category = CATEGORY_DOCUMENT,
            date = document.date,
            timestamp = timestamp,
            receiptId = null,
            documentId = document.id,
            currency = document.currency,
            synced = false,
            updatedAt = System.currentTimeMillis(),
            deletedAt = null,
        )
        transactionRepository.save(transaction)
    }

    private fun computeMonthlyData(
        allTransactions: List<TransactionEntity>,
        currentPeriod: FinancePeriod,
    ): List<MonthData> {
        val calendar = Calendar.getInstance()
        val fmt = SimpleDateFormat("MMM", Locale.getDefault())
        val months = mutableListOf<MonthData>()

        for (i in 5 downTo 0) {
            val cal = Calendar.getInstance().apply {
                timeInMillis = currentPeriod.startMs
                add(Calendar.MONTH, -i)
            }
            val year = cal.get(Calendar.YEAR)
            val month = cal.get(Calendar.MONTH)

            val monthStart = Calendar.getInstance().apply {
                set(year, month, 1, 0, 0, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis

            val monthEnd = Calendar.getInstance().apply {
                set(year, month, getActualMaximum(Calendar.DAY_OF_MONTH), 23, 59, 59)
                set(Calendar.MILLISECOND, 999)
            }.timeInMillis

            val income = allTransactions.filter {
                it.type == TYPE_INCOME && it.timestamp in monthStart..monthEnd
            }.sumOf { it.amount }

            val expense = allTransactions.filter {
                it.type == TYPE_EXPENSE && it.timestamp in monthStart..monthEnd
            }.sumOf { it.amount }

            months.add(MonthData(label = fmt.format(cal.time), income = income, expense = expense))
        }
        return months
    }

    private fun parseDateToTimestamp(date: String): Long {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            sdf.parse(date)?.time ?: System.currentTimeMillis()
        } catch (_: Exception) {
            System.currentTimeMillis()
        }
    }

    companion object {
        const val TYPE_INCOME = "INCOME"
        const val TYPE_EXPENSE = "EXPENSE"
        const val CATEGORY_DOCUMENT = "DOCUMENT"
        const val DEFAULT_CATEGORIES = "GENERAL"

        fun currentMonthPeriod(): FinancePeriod {
            val cal = Calendar.getInstance()
            cal.set(Calendar.DAY_OF_MONTH, 1)
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val start = cal.timeInMillis
            cal.set(Calendar.DAY_OF_MONTH, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
            cal.set(Calendar.HOUR_OF_DAY, 23)
            cal.set(Calendar.MINUTE, 59)
            cal.set(Calendar.SECOND, 59)
            cal.set(Calendar.MILLISECOND, 999)
            val end = cal.timeInMillis
            val label = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(cal.time)
            return FinancePeriod(start, end, label)
        }

        fun previousMonthPeriod(): FinancePeriod {
            val cal = Calendar.getInstance()
            cal.add(Calendar.MONTH, -1)
            cal.set(Calendar.DAY_OF_MONTH, 1)
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val start = cal.timeInMillis
            cal.set(Calendar.DAY_OF_MONTH, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
            cal.set(Calendar.HOUR_OF_DAY, 23)
            cal.set(Calendar.MINUTE, 59)
            cal.set(Calendar.SECOND, 59)
            cal.set(Calendar.MILLISECOND, 999)
            val end = cal.timeInMillis
            val label = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(cal.time)
            return FinancePeriod(start, end, label)
        }

        fun nextMonthPeriod(): FinancePeriod {
            val cal = Calendar.getInstance()
            cal.add(Calendar.MONTH, 1)
            cal.set(Calendar.DAY_OF_MONTH, 1)
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val start = cal.timeInMillis
            cal.set(Calendar.DAY_OF_MONTH, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
            cal.set(Calendar.HOUR_OF_DAY, 23)
            cal.set(Calendar.MINUTE, 59)
            cal.set(Calendar.SECOND, 59)
            cal.set(Calendar.MILLISECOND, 999)
            val end = cal.timeInMillis
            val label = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(cal.time)
            return FinancePeriod(start, end, label)
        }

        val FINANCE_CATEGORIES = emptyList<String>()

        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                FinanceViewModel(
                    transactionRepository = app.transactionRepository,
                    documentRepository = app.documentRepository,
                    companySettingsRepository = app.companySettingsRepository,
                )
            }
        }
    }
}
