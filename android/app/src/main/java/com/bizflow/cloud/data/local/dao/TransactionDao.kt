package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bizflow.cloud.data.local.entity.TransactionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(transaction: TransactionEntity)

    @Query("UPDATE transactions SET deletedAt = :now, updatedAt = :now WHERE id = :id")
    suspend fun softDelete(id: String, now: Long)

    @Query("SELECT * FROM transactions WHERE deletedAt IS NULL ORDER BY timestamp DESC")
    fun observeAll(): Flow<List<TransactionEntity>>

    @Query("SELECT * FROM transactions WHERE deletedAt IS NULL AND documentId = :documentId LIMIT 1")
    suspend fun getByDocumentId(documentId: String): TransactionEntity?

    @Query("SELECT * FROM transactions WHERE deletedAt IS NULL AND documentId = :documentId LIMIT 1")
    fun observeByDocumentId(documentId: String): Flow<TransactionEntity?>

    @Query("SELECT * FROM transactions WHERE documentId = :documentId AND deletedAt IS NOT NULL LIMIT 1")
    suspend fun getSoftDeletedByDocumentId(documentId: String): TransactionEntity?

    @Query("UPDATE transactions SET deletedAt = :now, updatedAt = :now WHERE documentId = :documentId AND deletedAt IS NULL")
    suspend fun softDeleteByDocumentId(documentId: String, now: Long)

    @Query("DELETE FROM transactions WHERE userId = :userId")
    suspend fun clearForUser(userId: String)

    @Query("""
        SELECT * FROM transactions
        WHERE deletedAt IS NULL
        AND timestamp BETWEEN :startMs AND :endMs
        ORDER BY timestamp DESC
    """)
    fun observeByPeriod(startMs: Long, endMs: Long): Flow<List<TransactionEntity>>

    @Query("""
        SELECT COALESCE(SUM(amount), 0.0) FROM transactions
        WHERE deletedAt IS NULL AND type = :type
        AND timestamp BETWEEN :startMs AND :endMs
    """)
    fun sumByTypeAndPeriod(type: String, startMs: Long, endMs: Long): Flow<Double>
}
