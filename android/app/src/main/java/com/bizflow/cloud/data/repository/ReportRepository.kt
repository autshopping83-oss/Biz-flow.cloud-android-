package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.DocumentDao
import com.bizflow.cloud.data.local.dao.LineItemDao
import com.bizflow.cloud.data.local.dao.TransactionDao
import com.bizflow.cloud.data.local.model.CategorySummary
import com.bizflow.cloud.data.local.model.ProductAggregation

class ReportRepository(
    private val documentDao: DocumentDao,
    private val lineItemDao: LineItemDao,
    private val transactionDao: TransactionDao,
) {

    suspend fun documentCountByPeriod(startMs: Long, endMs: Long): Int =
        documentDao.countByPeriod(startMs, endMs)

    suspend fun documentCountByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): Int =
        documentDao.countByPeriodAndCurrency(currency, startMs, endMs)

    suspend fun documentCountByStatusAndPeriod(status: String, startMs: Long, endMs: Long): Int =
        documentDao.countByStatusAndPeriod(status, startMs, endMs)

    suspend fun documentCountByStatusAndPeriodAndCurrency(status: String, currency: String, startMs: Long, endMs: Long): Int =
        documentDao.countByStatusAndPeriodAndCurrency(status, currency, startMs, endMs)

    suspend fun documentCountByTypeAndPeriod(type: String, startMs: Long, endMs: Long): Int =
        documentDao.countByTypeAndPeriod(type, startMs, endMs)

    suspend fun documentCountByTypeAndPeriodAndCurrency(type: String, currency: String, startMs: Long, endMs: Long): Int =
        documentDao.countByTypeAndPeriodAndCurrency(type, currency, startMs, endMs)

    suspend fun salesTotalByPeriod(startMs: Long, endMs: Long): Double =
        documentDao.sumTotalByPeriod(startMs, endMs)

    suspend fun salesTotalByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): Double =
        documentDao.sumTotalByPeriodAndCurrency(currency, startMs, endMs)

    suspend fun salesTotalByTypeAndPeriod(type: String, startMs: Long, endMs: Long): Double =
        documentDao.sumTotalByTypeAndPeriod(type, startMs, endMs)

    suspend fun salesTotalByTypePeriodAndCurrency(type: String, currency: String, startMs: Long, endMs: Long): Double =
        documentDao.sumTotalByTypePeriodAndCurrency(type, currency, startMs, endMs)

    suspend fun averageTicketByPeriod(startMs: Long, endMs: Long): Double =
        documentDao.avgTotalByPeriod(startMs, endMs)

    suspend fun averageTicketByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): Double =
        documentDao.avgTotalByPeriodAndCurrency(currency, startMs, endMs)

    suspend fun topClientNamesByDocumentCount(startMs: Long, endMs: Long, limit: Int = 10): List<String> =
        documentDao.topClientNamesByCount(startMs, endMs, limit)

    suspend fun topClientNamesByTotal(startMs: Long, endMs: Long, limit: Int = 10): List<String> =
        documentDao.topClientNamesByTotal(startMs, endMs, limit)

    suspend fun topClientNamesByTotalAndCurrency(currency: String, startMs: Long, endMs: Long, limit: Int = 10): List<String> =
        documentDao.topClientNamesByTotalAndCurrency(currency, startMs, endMs, limit)

    suspend fun clientTotalByPeriod(clientName: String, startMs: Long, endMs: Long): Double =
        documentDao.sumTotalByClientAndPeriod(clientName, startMs, endMs)

    suspend fun clientTotalByPeriodAndCurrency(clientName: String, currency: String, startMs: Long, endMs: Long): Double =
        documentDao.sumTotalByClientAndPeriodAndCurrency(clientName, currency, startMs, endMs)

    suspend fun clientDocumentCountByPeriod(clientName: String, startMs: Long, endMs: Long): Int =
        documentDao.countByClientAndPeriod(clientName, startMs, endMs)

    suspend fun clientDocumentCountByPeriodAndCurrency(clientName: String, currency: String, startMs: Long, endMs: Long): Int =
        documentDao.countByClientAndPeriodAndCurrency(clientName, currency, startMs, endMs)

    suspend fun topProductsByRevenue(startMs: Long, endMs: Long, limit: Int = 10): List<ProductAggregation> =
        lineItemDao.topProductsByTotal(startMs, endMs, limit)

    suspend fun topProductsByRevenueAndCurrency(currency: String, startMs: Long, endMs: Long, limit: Int = 10): List<ProductAggregation> =
        lineItemDao.topProductsByTotalAndCurrency(currency, startMs, endMs, limit)

    suspend fun topProductsByQuantity(startMs: Long, endMs: Long, limit: Int = 10): List<ProductAggregation> =
        lineItemDao.topProductsByQuantity(startMs, endMs, limit)

    suspend fun topProductsByQuantityAndCurrency(currency: String, startMs: Long, endMs: Long, limit: Int = 10): List<ProductAggregation> =
        lineItemDao.topProductsByQuantityAndCurrency(currency, startMs, endMs, limit)

    suspend fun allProductsAggregated(startMs: Long, endMs: Long): List<ProductAggregation> =
        lineItemDao.allProductsAggregated(startMs, endMs)

    suspend fun allProductsAggregatedByCurrency(currency: String, startMs: Long, endMs: Long): List<ProductAggregation> =
        lineItemDao.allProductsAggregatedByCurrency(currency, startMs, endMs)

    suspend fun transactionIncomeByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): Double =
        transactionDao.sumByTypePeriodAndCurrency("INCOME", currency, startMs, endMs)

    suspend fun transactionExpenseByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): Double =
        transactionDao.sumByTypePeriodAndCurrency("EXPENSE", currency, startMs, endMs)

    suspend fun transactionCountByTypeAndPeriod(type: String, startMs: Long, endMs: Long): Int =
        transactionDao.countByTypeAndPeriod(type, startMs, endMs)

    suspend fun incomeCategorySummary(startMs: Long, endMs: Long): List<CategorySummary> =
        transactionDao.categorySummaryByTypeAndPeriod("INCOME", startMs, endMs)

    suspend fun incomeCategorySummaryByCurrency(currency: String, startMs: Long, endMs: Long): List<CategorySummary> =
        transactionDao.categorySummaryByTypePeriodAndCurrency("INCOME", currency, startMs, endMs)

    suspend fun expenseCategorySummary(startMs: Long, endMs: Long): List<CategorySummary> =
        transactionDao.categorySummaryByTypeAndPeriod("EXPENSE", startMs, endMs)

    suspend fun expenseCategorySummaryByCurrency(currency: String, startMs: Long, endMs: Long): List<CategorySummary> =
        transactionDao.categorySummaryByTypePeriodAndCurrency("EXPENSE", currency, startMs, endMs)
}
