package com.bizflow.cloud.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.local.model.ProductAggregation
import com.bizflow.cloud.data.model.CurrencyCatalog
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.ReportRepository
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ReportsViewModel(
    private val reportRepository: ReportRepository,
    private val companySettingsRepository: CompanySettingsRepository,
) : ViewModel() {

    data class ReportPeriod(
        val startMs: Long,
        val endMs: Long,
        val label: String,
    )

    data class ClientRanking(
        val name: String,
        val documentCount: Int,
        val totalValue: Double,
    )

    data class SalesMetrics(
        val totalSales: Double = 0.0,
        val salesCount: Int = 0,
        val averageTicket: Double = 0.0,
        val salesByType: Map<String, Double> = emptyMap(),
    )

    data class DocumentMetrics(
        val totalCount: Int = 0,
        val paidCount: Int = 0,
        val issuedCount: Int = 0,
        val pendingCount: Int = 0,
        val cancelledCount: Int = 0,
        val countByType: Map<String, Int> = emptyMap(),
    )

    data class ProductMetrics(
        val topByRevenue: List<ProductAggregation> = emptyList(),
        val topByQuantity: List<ProductAggregation> = emptyList(),
    )

    data class ReportsUiState(
        val period: ReportPeriod = currentMonthPeriod(),
        val selectedCurrency: String? = null,
        val settingsCurrency: String = "MZN",
        val availableCurrencies: List<String> = emptyList(),
        val sales: SalesMetrics = SalesMetrics(),
        val documents: DocumentMetrics = DocumentMetrics(),
        val products: ProductMetrics = ProductMetrics(),
        val clients: List<ClientRanking> = emptyList(),
        val selectedTab: ReportTab = ReportTab.SALES,
        val isLoading: Boolean = true,
    )

    enum class ReportTab { SALES, DOCUMENTS, PRODUCTS, CLIENTS }

    private val _period = MutableStateFlow(currentMonthPeriod())
    private val _selectedCurrency = MutableStateFlow<String?>(null)
    private val _selectedTab = MutableStateFlow(ReportTab.SALES)

    val uiState: StateFlow<ReportsUiState> = combine(
        _period,
        _selectedCurrency,
        _selectedTab,
    ) { period, selectedCurrency, selectedTab ->
        val settingsCurrency = companySettingsRepository.getCurrency()
        val activeCurrency = selectedCurrency ?: settingsCurrency
        val availableCurrencies = CurrencyCatalog.ALL.map { it.code }
        buildUiState(period, activeCurrency, selectedCurrency, settingsCurrency, selectedTab, availableCurrencies)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = ReportsUiState(),
    )

    private suspend fun buildUiState(
        period: ReportPeriod,
        activeCurrency: String,
        selectedCurrency: String?,
        settingsCurrency: String,
        selectedTab: ReportTab,
        availableCurrencies: List<String>,
    ): ReportsUiState {
        val sales = buildSalesMetrics(period, activeCurrency)
        val documents = buildDocumentMetrics(period, activeCurrency)
        val products = buildProductMetrics(period, activeCurrency)
        val clients = buildClientRanking(period, activeCurrency)

        return ReportsUiState(
            period = period,
            selectedCurrency = selectedCurrency,
            settingsCurrency = settingsCurrency,
            availableCurrencies = availableCurrencies,
            sales = sales,
            documents = documents,
            products = products,
            clients = clients,
            selectedTab = selectedTab,
            isLoading = false,
        )
    }

    private suspend fun buildSalesMetrics(period: ReportPeriod, currency: String): SalesMetrics {
        val totalSales = reportRepository.salesTotalByPeriodAndCurrency(currency, period.startMs, period.endMs)
        val paidCount = reportRepository.documentCountByStatusAndPeriod(DocumentStatus.PAGO.name, period.startMs, period.endMs)
        val averageTicket = reportRepository.averageTicketByPeriodAndCurrency(currency, period.startMs, period.endMs)

        val salesByType = mutableMapOf<String, Double>()
        for (type in DocumentType.entries) {
            val amount = reportRepository.salesTotalByTypePeriodAndCurrency(type.code, currency, period.startMs, period.endMs)
            if (amount > 0.0) {
                salesByType[type.code] = amount
            }
        }

        return SalesMetrics(
            totalSales = totalSales,
            salesCount = paidCount,
            averageTicket = averageTicket,
            salesByType = salesByType,
        )
    }

    private suspend fun buildDocumentMetrics(period: ReportPeriod, currency: String): DocumentMetrics {
        val paid = reportRepository.documentCountByStatusAndPeriod(DocumentStatus.PAGO.name, period.startMs, period.endMs)
        val issued = reportRepository.documentCountByStatusAndPeriod(DocumentStatus.EMITIDO.name, period.startMs, period.endMs)
        val pending = reportRepository.documentCountByStatusAndPeriod(DocumentStatus.PENDENTE.name, period.startMs, period.endMs)
        val cancelled = reportRepository.documentCountByStatusAndPeriod(DocumentStatus.ANULADO.name, period.startMs, period.endMs)

        val countByType = mutableMapOf<String, Int>()
        for (type in DocumentType.entries) {
            countByType[type.code] = reportRepository.documentCountByTypeAndPeriod(type.code, period.startMs, period.endMs)
        }

        return DocumentMetrics(
            totalCount = paid + issued + pending + cancelled,
            paidCount = paid,
            issuedCount = issued,
            pendingCount = pending,
            cancelledCount = cancelled,
            countByType = countByType,
        )
    }

    private suspend fun buildProductMetrics(period: ReportPeriod, currency: String): ProductMetrics {
        val topByRevenue = reportRepository.topProductsByRevenueAndCurrency(currency, period.startMs, period.endMs, 10)
        val topByQuantity = reportRepository.topProductsByQuantity(period.startMs, period.endMs, 10)
        return ProductMetrics(
            topByRevenue = topByRevenue,
            topByQuantity = topByQuantity,
        )
    }

    private suspend fun buildClientRanking(period: ReportPeriod, currency: String): List<ClientRanking> {
        val topNames = reportRepository.topClientNamesByTotal(period.startMs, period.endMs, 10)
        return topNames.map { name ->
            ClientRanking(
                name = name,
                documentCount = reportRepository.clientDocumentCountByPeriod(name, period.startMs, period.endMs),
                totalValue = reportRepository.clientTotalByPeriod(name, period.startMs, period.endMs),
            )
        }
    }

    fun setPeriod(period: ReportPeriod) {
        _period.value = period
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

    fun setCurrency(currency: String?) {
        _selectedCurrency.value = currency
    }

    fun setTab(tab: ReportTab) {
        _selectedTab.value = tab
    }

    companion object {
        fun currentMonthPeriod(): ReportPeriod {
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
            return ReportPeriod(start, end, label)
        }

        fun previousMonthPeriod(): ReportPeriod {
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
            return ReportPeriod(start, end, label)
        }

        fun nextMonthPeriod(): ReportPeriod {
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
            return ReportPeriod(start, end, label)
        }

        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                ReportsViewModel(
                    reportRepository = ReportRepository(
                        documentDao = app.database.documentDao(),
                        lineItemDao = app.database.lineItemDao(),
                        transactionDao = app.database.transactionDao(),
                    ),
                    companySettingsRepository = app.companySettingsRepository,
                )
            }
        }
    }
}
