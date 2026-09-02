package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.SyncQueueDao
import com.bizflow.cloud.data.local.dao.TransactionDao
import com.bizflow.cloud.data.local.entity.SyncQueueEntity
import com.bizflow.cloud.data.local.entity.TransactionEntity
import kotlinx.coroutines.flow.Flow

class TransactionRepository(
    private val transactionDao: TransactionDao,
    private val syncQueueDao: SyncQueueDao,
    private val userIdProvider: () -> String? = { null },
) {
    fun observeAll(): Flow<List<TransactionEntity>> = transactionDao.observeAll()

    fun observeByPeriod(startMs: Long, endMs: Long): Flow<List<TransactionEntity>> =
        transactionDao.observeByPeriod(startMs, endMs)

    fun sumByTypeAndPeriod(type: String, startMs: Long, endMs: Long): Flow<Double> =
        transactionDao.sumByTypeAndPeriod(type, startMs, endMs)

    fun observeByDocumentId(documentId: String): Flow<TransactionEntity?> =
        transactionDao.observeByDocumentId(documentId)

    suspend fun getByDocumentId(documentId: String): TransactionEntity? =
        transactionDao.getByDocumentId(documentId)

    suspend fun save(transaction: TransactionEntity) {
        val uid = userIdProvider()
        val owned = if (uid != null && transaction.userId == null) transaction.copy(userId = uid) else transaction
        transactionDao.upsert(owned)
        syncQueueDao.insert(
            SyncQueueEntity.pending(
                userId = uid,
                entityType = "TRANSACTION",
                entityId = owned.id,
                operation = SyncQueueEntity.OP_UPSERT,
                now = System.currentTimeMillis(),
            ),
        )
    }

    suspend fun softDelete(id: String) {
        transactionDao.softDelete(id, System.currentTimeMillis())
        syncQueueDao.insert(
            SyncQueueEntity.pending(
                userId = userIdProvider(),
                entityType = "TRANSACTION",
                entityId = id,
                operation = SyncQueueEntity.OP_DELETE,
                now = System.currentTimeMillis(),
            ),
        )
    }
}
