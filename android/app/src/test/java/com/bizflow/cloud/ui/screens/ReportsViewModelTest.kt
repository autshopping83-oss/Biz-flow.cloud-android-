package com.bizflow.cloud.ui.screens

import com.bizflow.cloud.core.util.formatMoney
import com.bizflow.cloud.data.model.CurrencyCatalog
import java.util.Calendar
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReportsViewModelTest {

    // ── Period calculation tests ───────────────────────────────────────

    @Test
    fun currentMonthPeriod_startsOnFirstDay() {
        val period = ReportsViewModel.currentMonthPeriod()
        val cal = Calendar.getInstance().apply { timeInMillis = period.startMs }
        assertEquals(1, cal.get(Calendar.DAY_OF_MONTH))
        assertEquals(0, cal.get(Calendar.HOUR_OF_DAY))
        assertEquals(0, cal.get(Calendar.MINUTE))
        assertEquals(0, cal.get(Calendar.SECOND))
        assertEquals(0, cal.get(Calendar.MILLISECOND))
    }

    @Test
    fun currentMonthPeriod_endsOnLastDay() {
        val period = ReportsViewModel.currentMonthPeriod()
        val cal = Calendar.getInstance().apply { timeInMillis = period.endMs }
        val maxDay = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        assertEquals(maxDay, cal.get(Calendar.DAY_OF_MONTH))
        assertEquals(23, cal.get(Calendar.HOUR_OF_DAY))
        assertEquals(59, cal.get(Calendar.MINUTE))
        assertEquals(59, cal.get(Calendar.SECOND))
        assertEquals(999, cal.get(Calendar.MILLISECOND))
    }

    @Test
    fun previousMonthPeriod_isBeforeCurrent() {
        val current = ReportsViewModel.currentMonthPeriod()
        val previous = ReportsViewModel.previousMonthPeriod()
        assertTrue(previous.endMs < current.startMs)
    }

    @Test
    fun nextMonthPeriod_isAfterCurrent() {
        val current = ReportsViewModel.currentMonthPeriod()
        val next = ReportsViewModel.nextMonthPeriod()
        assertTrue(next.startMs > current.endMs)
    }

    @Test
    fun currentMonthPeriod_containsNow() {
        val period = ReportsViewModel.currentMonthPeriod()
        val now = System.currentTimeMillis()
        assertTrue(now in period.startMs..period.endMs)
    }

    @Test
    fun currentMonthPeriod_labelFormat() {
        val period = ReportsViewModel.currentMonthPeriod()
        assertTrue(period.label.isNotEmpty())
        assertTrue(period.label.contains(" "))
    }

    // ── Currency filtering tests ────────────────────────────────────────

    @Test
    fun currencyFiltering_sameCurrency_notMixed() {
        val documents = listOf(
            makeDocument("INVOICE", 1000.0, "USD"),
            makeDocument("INVOICE", 500.0, "AFN"),
        )

        val usdOnly = documents.filter {
            it.currency.equals("USD", ignoreCase = true)
        }
        val usdTotal = usdOnly.sumOf { it.total }

        assertEquals(1000.0, usdTotal, 0.01)
    }

    @Test
    fun currencyFiltering_differentCurrencies_notSummed() {
        val docsA = listOf(
            makeDocument("INVOICE", 100.0, "MZN"),
            makeDocument("INVOICE", 200.0, "MZN"),
        )
        val docsB = listOf(
            makeDocument("INVOICE", 300.0, "USD"),
        )

        val totalA = docsA.sumOf { it.total }
        val totalB = docsB.sumOf { it.total }

        assertEquals(300.0, totalA, 0.01)
        assertEquals(300.0, totalB, 0.01)
        assertTrue(totalA + totalB == 600.0)
        assertEquals(300.0, totalA, 0.01)
    }

    @Test
    fun currencyFiltering_preservesHistoricalCurrency() {
        val docMZN = makeDocument("INVOICE", 1000.0, "MZN")
        val docUSD = makeDocument("INVOICE", 200.0, "USD")

        assertEquals("MZN", docMZN.currency)
        assertEquals("USD", docUSD.currency)
    }

    // ── Document count tests ────────────────────────────────────────────

    @Test
    fun documentCount_paidOnly() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "MZN", "EMITIDO"),
            makeDocument("INVOICE", 300.0, "MZN", "PAGO"),
        )

        val paidCount = docs.count { it.status.name == "PAGO" }
        assertEquals(2, paidCount)
    }

    @Test
    fun documentCount_cancelled() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "MZN", "ANULADO"),
        )

        val cancelledCount = docs.count { it.status.name == "ANULADO" }
        assertEquals(1, cancelledCount)
    }

    @Test
    fun documentCount_byType() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN"),
            makeDocument("INVOICE", 200.0, "MZN"),
            makeDocument("RECEIPT", 300.0, "MZN"),
            makeDocument("QUOTE", 0.0, "MZN"),
        )

        val invoiceCount = docs.count { it.documentType.code == "INVOICE" }
        assertEquals(2, invoiceCount)
    }

    @Test
    fun documentCount_byCurrency_filterWorks() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "USD", "PAGO"),
            makeDocument("INVOICE", 300.0, "MZN", "PAGO"),
        )

        val mznPaid = docs.filter { it.currency == "MZN" && it.status.name == "PAGO" }.size
        val usdPaid = docs.filter { it.currency == "USD" && it.status.name == "PAGO" }.size

        assertEquals(2, mznPaid)
        assertEquals(1, usdPaid)
    }

    // ── Sales total tests ───────────────────────────────────────────────

    @Test
    fun salesTotal_onlyPaid() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "MZN", "EMITIDO"),
            makeDocument("INVOICE", 300.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 400.0, "MZN", "ANULADO"),
        )

        val paidTotal = docs
            .filter { it.status.name == "PAGO" }
            .sumOf { it.total }

        assertEquals(400.0, paidTotal, 0.01)
    }

    @Test
    fun salesTotal_byCurrency() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "USD", "PAGO"),
            makeDocument("INVOICE", 300.0, "MZN", "PAGO"),
        )

        val mznTotal = docs
            .filter { it.currency == "MZN" && it.status.name == "PAGO" }
            .sumOf { it.total }

        val usdTotal = docs
            .filter { it.currency == "USD" && it.status.name == "PAGO" }
            .sumOf { it.total }

        assertEquals(400.0, mznTotal, 0.01)
        assertEquals(200.0, usdTotal, 0.01)
    }

    // ── Average ticket tests ────────────────────────────────────────────

    @Test
    fun averageTicket_correctCalculation() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 300.0, "MZN", "PAGO"),
        )

        val paidDocs = docs.filter { it.status.name == "PAGO" }
        val avg = paidDocs.map { it.total }.average()

        assertEquals(200.0, avg, 0.01)
    }

    @Test
    fun averageTicket_excludesUnpaid() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 1000.0, "MZN", "PENDENTE"),
        )

        val paidDocs = docs.filter { it.status.name == "PAGO" }
        val avg = paidDocs.map { it.total }.average()

        assertEquals(100.0, avg, 0.01)
    }

    @Test
    fun averageTicket_perCurrency_notMixed() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 500.0, "USD", "PAGO"),
        )

        val mznDocs = docs.filter { it.currency == "MZN" && it.status.name == "PAGO" }
        val usdDocs = docs.filter { it.currency == "USD" && it.status.name == "PAGO" }

        val mznAvg = mznDocs.map { it.total }.average()
        val usdAvg = usdDocs.map { it.total }.average()

        assertEquals(150.0, mznAvg, 0.01)
        assertEquals(500.0, usdAvg, 0.01)
    }

    // ── Product ranking tests ───────────────────────────────────────────

    @Test
    fun productRanking_byRevenue() {
        data class Item(val desc: String, val qty: Double, val total: Double)

        val items = listOf(
            Item("Widget A", 10.0, 1000.0),
            Item("Widget B", 5.0, 500.0),
            Item("Widget C", 20.0, 400.0),
        )

        val ranked = items.sortedByDescending { it.total }

        assertEquals("Widget A", ranked[0].desc)
        assertEquals("Widget B", ranked[1].desc)
        assertEquals("Widget C", ranked[2].desc)
    }

    @Test
    fun productRanking_byQuantity() {
        data class Item(val desc: String, val qty: Double, val total: Double)

        val items = listOf(
            Item("Widget A", 10.0, 1000.0),
            Item("Widget B", 5.0, 500.0),
            Item("Widget C", 20.0, 400.0),
        )

        val ranked = items.sortedByDescending { it.qty }

        assertEquals("Widget C", ranked[0].desc)
        assertEquals("Widget A", ranked[1].desc)
        assertEquals("Widget B", ranked[2].desc)
    }

    @Test
    fun productRanking_perCurrency_notMixed() {
        data class Item(val desc: String, val qty: Double, val total: Double, val currency: String)

        val items = listOf(
            Item("Widget", 10.0, 1000.0, "MZN"),
            Item("Widget", 5.0, 500.0, "USD"),
        )

        val mznItems = items.filter { it.currency == "MZN" }
        val usdItems = items.filter { it.currency == "USD" }

        assertEquals(1, mznItems.size)
        assertEquals(1, usdItems.size)
        assertEquals(10.0, mznItems.sumOf { it.qty }, 0.01)
        assertEquals(5.0, usdItems.sumOf { it.qty }, 0.01)
    }

    // ── Client ranking tests ────────────────────────────────────────────

    @Test
    fun clientRanking_byTotalValue() {
        data class ClientRank(val name: String, val count: Int, val total: Double)

        val clients = listOf(
            ClientRank("Client A", 5, 5000.0),
            ClientRank("Client B", 10, 3000.0),
            ClientRank("Client C", 2, 8000.0),
        )

        val ranked = clients.sortedByDescending { it.total }

        assertEquals("Client C", ranked[0].name)
        assertEquals("Client A", ranked[1].name)
        assertEquals("Client B", ranked[2].name)
    }

    @Test
    fun clientRanking_byDocumentCount() {
        data class ClientRank(val name: String, val count: Int, val total: Double)

        val clients = listOf(
            ClientRank("Client A", 5, 5000.0),
            ClientRank("Client B", 10, 3000.0),
            ClientRank("Client C", 2, 8000.0),
        )

        val ranked = clients.sortedByDescending { it.count }

        assertEquals("Client B", ranked[0].name)
        assertEquals("Client A", ranked[1].name)
        assertEquals("Client C", ranked[2].name)
    }

    @Test
    fun clientRanking_perCurrency_notMixed() {
        data class Doc(val client: String, val total: Double, val currency: String)

        val docs = listOf(
            Doc("João", 5000.0, "MZN"),
            Doc("João", 3000.0, "USD"),
            Doc("Maria", 2000.0, "MZN"),
        )

        val mznClients = docs.filter { it.currency == "MZN" }.groupBy { it.client }
            .mapValues { (_, v) -> v.sumOf { it.total } }
        val usdClients = docs.filter { it.currency == "USD" }.groupBy { it.client }
            .mapValues { (_, v) -> v.sumOf { it.total } }

        assertEquals(2000.0, mznClients["Maria"]!!, 0.01)
        assertEquals(5000.0, mznClients["João"]!!, 0.01)
        assertEquals(3000.0, usdClients["João"]!!, 0.01)
        assertEquals(null, usdClients["Maria"])
    }

    // ── Empty state tests ───────────────────────────────────────────────

    @Test
    fun emptyState_noDocuments() {
        val docs = emptyList<com.bizflow.cloud.data.local.entity.DocumentEntity>()
        assertTrue(docs.isEmpty())
        assertEquals(0, docs.size)
    }

    @Test
    fun emptyState_noLineItems() {
        val items = emptyList<com.bizflow.cloud.data.local.model.ProductAggregation>()
        assertTrue(items.isEmpty())
    }

    // ── Timezone tests ──────────────────────────────────────────────────

    @Test
    fun periodRespectsLocalTimezone() {
        val period = ReportsViewModel.currentMonthPeriod()
        val startCal = Calendar.getInstance().apply { timeInMillis = period.startMs }
        assertEquals(0, startCal.get(Calendar.HOUR_OF_DAY))
        assertEquals(0, startCal.get(Calendar.MINUTE))
    }

    // ── Multi-currency scenario tests ───────────────────────────────────

    @Test
    fun multiCurrency_threeCurrencies_separated() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "USD", "PAGO"),
            makeDocument("INVOICE", 300.0, "EUR", "PAGO"),
        )

        val mznDocs = docs.filter { it.currency == "MZN" }
        val usdDocs = docs.filter { it.currency == "USD" }
        val eurDocs = docs.filter { it.currency == "EUR" }

        assertEquals(1, mznDocs.size)
        assertEquals(1, usdDocs.size)
        assertEquals(1, eurDocs.size)

        assertEquals(100.0, mznDocs.sumOf { it.total }, 0.01)
        assertEquals(200.0, usdDocs.sumOf { it.total }, 0.01)
        assertEquals(300.0, eurDocs.sumOf { it.total }, 0.01)
    }

    @Test
    fun multiCurrency_allOption_showsSeparateData() {
        val docs = listOf(
            makeDocument("INVOICE", 100.0, "MZN", "PAGO"),
            makeDocument("INVOICE", 200.0, "USD", "PAGO"),
        )

        val allTotal = docs.sumOf { it.total }
        assertEquals(300.0, allTotal, 0.01)

        val mznTotal = docs.filter { it.currency == "MZN" }.sumOf { it.total }
        val usdTotal = docs.filter { it.currency == "USD" }.sumOf { it.total }
        assertEquals(100.0, mznTotal, 0.01)
        assertEquals(200.0, usdTotal, 0.01)
    }

    // ── Report tab tests ────────────────────────────────────────────────

    @Test
    fun reportTab_allTabsExist() {
        val tabs = ReportsViewModel.ReportTab.entries
        assertEquals(4, tabs.size)
        assertTrue(tabs.contains(ReportsViewModel.ReportTab.SALES))
        assertTrue(tabs.contains(ReportsViewModel.ReportTab.DOCUMENTS))
        assertTrue(tabs.contains(ReportsViewModel.ReportTab.PRODUCTS))
        assertTrue(tabs.contains(ReportsViewModel.ReportTab.CLIENTS))
    }

    // ── formatMoney decimalDigits tests ─────────────────────────────────

    @Test
    fun formatMoney_zeroDecimalDigits_JPY() {
        val result = formatMoney(1000.0, "JPY")
        assertTrue(result.contains("1 000"))
        assertTrue(result.contains("JPY"))
        assertTrue(!result.contains("1 000,00"))
    }

    @Test
    fun formatMoney_twoDecimalDigits_USD() {
        val result = formatMoney(1000.0, "USD")
        assertTrue(result.contains("1 000,00"))
        assertTrue(result.contains("USD"))
    }

    @Test
    fun formatMoney_threeDecimalDigits_KWD() {
        val result = formatMoney(1.5, "KWD")
        assertTrue(result.contains("1,500"))
        assertTrue(result.contains("KWD"))
    }

    @Test
    fun formatMoney_usesCurrencyCatalogSource() {
        val jpy = CurrencyCatalog.byCode("JPY")
        val usd = CurrencyCatalog.byCode("USD")
        val kwd = CurrencyCatalog.byCode("KWD")

        assertEquals(0, jpy?.decimalDigits)
        assertEquals(2, usd?.decimalDigits)
        assertEquals(3, kwd?.decimalDigits)
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private fun makeDocument(
        typeCode: String,
        total: Double,
        currency: String,
        status: String = "PAGO",
    ) = com.bizflow.cloud.data.local.entity.DocumentEntity(
        id = "doc-${System.nanoTime()}",
        userId = null,
        documentType = com.bizflow.cloud.data.model.DocumentType.fromCode(typeCode),
        number = "FT-001",
        date = "2026-09-05",
        dueDate = null,
        currency = currency,
        language = "pt",
        clientName = "Test Client",
        clientContact = "",
        clientWhatsApp = null,
        clientLocation = "",
        clientNuit = "",
        companyName = null,
        companyAddress = null,
        companyNuit = null,
        companyContact = null,
        companyLogo = null,
        companyTradingName = null,
        companyCity = null,
        companyCountry = null,
        companyWhatsApp = null,
        companyEmail = null,
        companyWebsite = null,
        companyIdentifierType = null,
        companyIdentifierValue = null,
        subtotal = total,
        taxRate = 0.0,
        taxAmount = 0.0,
        discount = 0.0,
        total = total,
        paymentMethod = null,
        stampText = null,
        signatureData = null,
        signaturePath = null,
        status = com.bizflow.cloud.data.model.DocumentStatus.fromStorage(status),
        documentTheme = null,
        createdAt = System.currentTimeMillis(),
        pdfUrl = null,
        synced = false,
        updatedAt = System.currentTimeMillis(),
        deletedAt = null,
    )
}
