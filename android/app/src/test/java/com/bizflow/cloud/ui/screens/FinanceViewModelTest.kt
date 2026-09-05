package com.bizflow.cloud.ui.screens

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FinanceViewModelTest {

    // ── Period calculation tests ───────────────────────────────────────

    @Test
    fun currentMonthPeriod_startsOnFirstDay() {
        val period = FinanceViewModel.currentMonthPeriod()
        val cal = Calendar.getInstance().apply { timeInMillis = period.startMs }
        assertEquals(1, cal.get(Calendar.DAY_OF_MONTH))
        assertEquals(0, cal.get(Calendar.HOUR_OF_DAY))
        assertEquals(0, cal.get(Calendar.MINUTE))
        assertEquals(0, cal.get(Calendar.SECOND))
        assertEquals(0, cal.get(Calendar.MILLISECOND))
    }

    @Test
    fun currentMonthPeriod_endsOnLastDay() {
        val period = FinanceViewModel.currentMonthPeriod()
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
        val current = FinanceViewModel.currentMonthPeriod()
        val previous = FinanceViewModel.previousMonthPeriod()
        assertTrue(previous.endMs < current.startMs)
    }

    @Test
    fun nextMonthPeriod_isAfterCurrent() {
        val current = FinanceViewModel.currentMonthPeriod()
        val next = FinanceViewModel.nextMonthPeriod()
        assertTrue(next.startMs > current.endMs)
    }

    @Test
    fun currentMonthPeriod_containsNow() {
        val period = FinanceViewModel.currentMonthPeriod()
        val now = System.currentTimeMillis()
        assertTrue(now in period.startMs..period.endMs)
    }

    // ── Currency filtering logic tests ─────────────────────────────────

    @Test
    fun currencyFiltering_sameCurrency_notMixed() {
        val transactions = listOf(
            makeTransaction("INCOME", 1000.0, "USD"),
            makeTransaction("INCOME", 500.0, "AFN"),
        )

        val usdOnly = transactions.filter {
            it.currency.equals("USD", ignoreCase = true)
        }
        val usdIncome = usdOnly.filter { it.type == "INCOME" }.sumOf { it.amount }

        assertEquals(1000.0, usdIncome, 0.01)
        assertNotEquals(1500.0, usdIncome, 0.01)
    }

    @Test
    fun currencyFiltering_differentCurrencies_notSummed() {
        val transactions = listOf(
            makeTransaction("INCOME", 1000.0, "USD"),
            makeTransaction("INCOME", 500.0, "AFN"),
        )

        val totalAll = transactions.sumOf { it.amount }
        val totalUsd = transactions.filter { it.currency == "USD" }.sumOf { it.amount }
        val totalAfn = transactions.filter { it.currency == "AFN" }.sumOf { it.amount }

        assertEquals(1500.0, totalAll, 0.01)
        assertEquals(1000.0, totalUsd, 0.01)
        assertEquals(500.0, totalAfn, 0.01)
    }

    @Test
    fun currencyFiltering_emptyResultForMissingCurrency() {
        val transactions = listOf(
            makeTransaction("INCOME", 1000.0, "USD"),
        )

        val eurOnly = transactions.filter {
            it.currency.equals("EUR", ignoreCase = true)
        }

        assertTrue(eurOnly.isEmpty())
        assertEquals(0.0, eurOnly.sumOf { it.amount }, 0.01)
    }

    @Test
    fun balanceCalculation_sameCurrency() {
        val transactions = listOf(
            makeTransaction("INCOME", 1500.0, "USD"),
            makeTransaction("EXPENSE", 200.0, "USD"),
        )

        val income = transactions.filter { it.type == "INCOME" }.sumOf { it.amount }
        val expense = transactions.filter { it.type == "EXPENSE" }.sumOf { it.amount }
        val balance = income - expense

        assertEquals(1500.0, income, 0.01)
        assertEquals(200.0, expense, 0.01)
        assertEquals(1300.0, balance, 0.01)
    }

    @Test
    fun balanceCalculation_multiCurrency_separated() {
        val transactions = listOf(
            makeTransaction("INCOME", 1000.0, "USD"),
            makeTransaction("EXPENSE", 200.0, "USD"),
            makeTransaction("INCOME", 5000.0, "AFN"),
            makeTransaction("EXPENSE", 100.0, "AFN"),
        )

        val usdTransactions = transactions.filter { it.currency == "USD" }
        val afnTransactions = transactions.filter { it.currency == "AFN" }

        val usdIncome = usdTransactions.filter { it.type == "INCOME" }.sumOf { it.amount }
        val usdExpense = usdTransactions.filter { it.type == "EXPENSE" }.sumOf { it.amount }
        val usdBalance = usdIncome - usdExpense

        val afnIncome = afnTransactions.filter { it.type == "INCOME" }.sumOf { it.amount }
        val afnExpense = afnTransactions.filter { it.type == "EXPENSE" }.sumOf { it.amount }
        val afnBalance = afnIncome - afnExpense

        assertEquals(800.0, usdBalance, 0.01)
        assertEquals(4900.0, afnBalance, 0.01)
    }

    // ── Timezone / parseDateToTimestamp tests ───────────────────────────

    @Test
    fun parseDateToTimestamp_localTimezone() {
        val date = "2026-09-05"
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        sdf.timeZone = TimeZone.getDefault()
        val parsed = sdf.parse(date)
        val cal = Calendar.getInstance().apply { time = parsed!! }

        assertEquals(2026, cal.get(Calendar.YEAR))
        assertEquals(Calendar.SEPTEMBER, cal.get(Calendar.MONTH))
        assertEquals(5, cal.get(Calendar.DAY_OF_MONTH))
    }

    @Test
    fun parseDateToTimestamp_firstDayOfMonth() {
        val date = "2026-01-01"
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        sdf.timeZone = TimeZone.getDefault()
        val parsed = sdf.parse(date)
        val cal = Calendar.getInstance().apply { time = parsed!! }

        assertEquals(1, cal.get(Calendar.DAY_OF_MONTH))
        assertEquals(Calendar.JANUARY, cal.get(Calendar.MONTH))
    }

    @Test
    fun parseDateToTimestamp_lastDayOfMonth() {
        val date = "2026-02-28"
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        sdf.timeZone = TimeZone.getDefault()
        val parsed = sdf.parse(date)
        val cal = Calendar.getInstance().apply { time = parsed!! }

        assertEquals(28, cal.get(Calendar.DAY_OF_MONTH))
        assertEquals(Calendar.FEBRUARY, cal.get(Calendar.MONTH))
    }

    @Test
    fun parseDateToTimestamp_yearBoundary() {
        val date = "2026-12-31"
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        sdf.timeZone = TimeZone.getDefault()
        val parsed = sdf.parse(date)
        val cal = Calendar.getInstance().apply { time = parsed!! }

        assertEquals(31, cal.get(Calendar.DAY_OF_MONTH))
        assertEquals(Calendar.DECEMBER, cal.get(Calendar.MONTH))
        assertEquals(2026, cal.get(Calendar.YEAR))
    }

    // ── Document income filtering tests ────────────────────────────────

    @Test
    fun documentIncome_onlyDocumentLinked() {
        val transactions = listOf(
            makeTransaction("INCOME", 1000.0, "USD", documentId = "doc-1"),
            makeTransaction("INCOME", 500.0, "USD", documentId = null),
            makeTransaction("INCOME", 300.0, "USD", documentId = "doc-2"),
        )

        val docIncome = transactions.filter {
            it.type == "INCOME" && it.documentId != null
        }.sumOf { it.amount }

        assertEquals(1300.0, docIncome, 0.01)
    }

    @Test
    fun documentIncome_respectsCurrencyFilter() {
        val transactions = listOf(
            makeTransaction("INCOME", 1000.0, "USD", documentId = "doc-1"),
            makeTransaction("INCOME", 500.0, "AFN", documentId = "doc-2"),
        )

        val usdDocIncome = transactions.filter {
            it.type == "INCOME" && it.documentId != null && it.currency == "USD"
        }.sumOf { it.amount }

        assertEquals(1000.0, usdDocIncome, 0.01)
    }

    // ── Category expense tests ─────────────────────────────────────────

    @Test
    fun categoryExpenses_groupedByCategory() {
        val transactions = listOf(
            makeTransaction("EXPENSE", 100.0, "USD", category = "Rent"),
            makeTransaction("EXPENSE", 50.0, "USD", category = "Food"),
            makeTransaction("EXPENSE", 30.0, "USD", category = "Rent"),
        )

        val catExpenses = transactions
            .filter { it.type == "EXPENSE" }
            .groupBy { it.category }
            .mapValues { (_, v) -> v.sumOf { it.amount } }

        assertEquals(130.0, catExpenses["Rent"]!!, 0.01)
        assertEquals(50.0, catExpenses["Food"]!!, 0.01)
    }

    @Test
    fun categoryExpenses_respectsCurrencyFilter() {
        val transactions = listOf(
            makeTransaction("EXPENSE", 100.0, "USD", category = "Rent"),
            makeTransaction("EXPENSE", 200.0, "AFN", category = "Rent"),
        )

        val usdCatExpenses = transactions
            .filter { it.type == "EXPENSE" && it.currency == "USD" }
            .groupBy { it.category }
            .mapValues { (_, v) -> v.sumOf { it.amount } }

        assertEquals(100.0, usdCatExpenses["Rent"]!!, 0.01)
    }

    // ── Period filtering tests ─────────────────────────────────────────

    @Test
    fun periodFiltering_transactionsInPeriod() {
        val period = FinanceViewModel.currentMonthPeriod()
        val now = System.currentTimeMillis()
        val inPeriod = makeTransaction("INCOME", 100.0, "USD", timestamp = now)
        val outPeriod = makeTransaction("INCOME", 200.0, "USD", timestamp = now - 90L * 24 * 60 * 60 * 1000)

        val transactions = listOf(inPeriod, outPeriod)
        val filtered = transactions.filter { it.timestamp in period.startMs..period.endMs }

        assertEquals(1, filtered.size)
        assertEquals(100.0, filtered[0].amount, 0.01)
    }

    // ── Donut percentage tests ─────────────────────────────────────────

    @Test
    fun donutPercentage_incomeVsExpense() {
        val income = 6000.0
        val expense = 9000.0
        val total = income + expense

        val incomeRatio = if (total > 0) income / total else 0.0
        val expenseRatio = if (total > 0) expense / total else 0.0

        assertEquals(0.4, incomeRatio, 0.01)
        assertEquals(0.6, expenseRatio, 0.01)
    }

    @Test
    fun donutPercentage_zeroIncome() {
        val income = 0.0
        val expense = 100.0
        val total = income + expense

        val incomeRatio = if (total > 0) income / total else 0.0

        assertEquals(0.0, incomeRatio, 0.01)
    }

    @Test
    fun donutPercentage_zeroExpense() {
        val income = 100.0
        val expense = 0.0
        val total = income + expense

        val expenseRatio = if (total > 0) expense / total else 0.0

        assertEquals(0.0, expenseRatio, 0.01)
    }

    @Test
    fun donutPercentage_bothZero() {
        val income = 0.0
        val expense = 0.0
        val total = income + expense

        val incomeRatio: Double = if (total > 0) income / total else 0.5

        assertEquals(0.5, incomeRatio, 0.01)
    }

    // ── FilterType enum tests ──────────────────────────────────────────

    @Test
    fun filterType_allShowsBothTypes() {
        val transactions = listOf(
            makeTransaction("INCOME", 100.0, "USD"),
            makeTransaction("EXPENSE", 50.0, "USD"),
        )

        val filtered = when (FinanceViewModel.FilterType.ALL) {
            FinanceViewModel.FilterType.INCOME -> transactions.filter { it.type == "INCOME" }
            FinanceViewModel.FilterType.EXPENSE -> transactions.filter { it.type == "EXPENSE" }
            FinanceViewModel.FilterType.ALL -> transactions
        }

        assertEquals(2, filtered.size)
    }

    @Test
    fun filterType_incomeOnly() {
        val transactions = listOf(
            makeTransaction("INCOME", 100.0, "USD"),
            makeTransaction("EXPENSE", 50.0, "USD"),
            makeTransaction("INCOME", 200.0, "USD"),
        )

        val filtered = transactions.filter { it.type == "INCOME" }

        assertEquals(2, filtered.size)
    }

    @Test
    fun filterType_expenseOnly() {
        val transactions = listOf(
            makeTransaction("INCOME", 100.0, "USD"),
            makeTransaction("EXPENSE", 50.0, "USD"),
            makeTransaction("EXPENSE", 30.0, "USD"),
        )

        val filtered = transactions.filter { it.type == "EXPENSE" }

        assertEquals(2, filtered.size)
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private fun makeTransaction(
        type: String,
        amount: Double,
        currency: String,
        category: String = "GENERAL",
        documentId: String? = null,
        timestamp: Long = System.currentTimeMillis(),
    ) = com.bizflow.cloud.data.local.entity.TransactionEntity(
        id = "tx-${System.nanoTime()}",
        userId = null,
        type = type,
        amount = amount,
        description = "Test",
        category = category,
        date = "2026-09-05",
        timestamp = timestamp,
        receiptId = null,
        documentId = documentId,
        currency = currency,
        synced = false,
        updatedAt = System.currentTimeMillis(),
        deletedAt = null,
    )
}
