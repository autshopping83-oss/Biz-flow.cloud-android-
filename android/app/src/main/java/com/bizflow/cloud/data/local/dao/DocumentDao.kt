package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.model.DocumentWithItems
import kotlinx.coroutines.flow.Flow

@Dao
interface DocumentDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(document: DocumentEntity)

    @Query("UPDATE documents SET deletedAt = :now, updatedAt = :now WHERE id = :id")
    suspend fun softDelete(id: String, now: Long)

    @Query("DELETE FROM documents WHERE id = :id")
    suspend fun hardDelete(id: String)

    @Transaction
    @Query("SELECT * FROM documents WHERE deletedAt IS NULL ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<DocumentWithItems>>

    @Transaction
    @Query("SELECT * FROM documents WHERE deletedAt IS NULL AND id = :id")
    fun observeById(id: String): Flow<DocumentWithItems?>

    @Transaction
    @Query("SELECT * FROM documents WHERE deletedAt IS NULL AND id = :id")
    suspend fun getById(id: String): DocumentWithItems?

    @Query("SELECT * FROM documents WHERE id = :id")
    suspend fun getEntityById(id: String): DocumentEntity?

    @Query("UPDATE documents SET synced = 1, updatedAt = :now WHERE id = :id")
    suspend fun markSynced(id: String, now: Long)

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND synced = 0")
    fun observePendingSyncCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND type = :type")
    suspend fun countByType(type: String): Int

    @Query("DELETE FROM documents WHERE userId = :userId")
    suspend fun clearForUser(userId: String)

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun countByPeriod(startMs: Long, endMs: Long): Int

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND status = :status AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun countByStatusAndPeriod(status: String, startMs: Long, endMs: Long): Int

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND type = :type AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun countByTypeAndPeriod(type: String, startMs: Long, endMs: Long): Int

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun observeCountByPeriod(startMs: Long, endMs: Long): Int

    @Query("SELECT COALESCE(SUM(total), 0.0) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun sumTotalByPeriod(startMs: Long, endMs: Long): Double

    @Query("SELECT COALESCE(SUM(total), 0.0) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND currency = :currency AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun sumTotalByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): Double

    @Query("SELECT COALESCE(SUM(total), 0.0) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND type = :type AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun sumTotalByTypeAndPeriod(type: String, startMs: Long, endMs: Long): Double

    @Query("SELECT COALESCE(SUM(total), 0.0) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND type = :type AND currency = :currency AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun sumTotalByTypePeriodAndCurrency(type: String, currency: String, startMs: Long, endMs: Long): Double

    @Query("SELECT COALESCE(AVG(total), 0.0) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun avgTotalByPeriod(startMs: Long, endMs: Long): Double

    @Query("SELECT COALESCE(AVG(total), 0.0) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND currency = :currency AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun avgTotalByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): Double

    @Query("SELECT clientName FROM documents WHERE deletedAt IS NULL AND clientName != '' AND createdAt BETWEEN :startMs AND :endMs GROUP BY clientName ORDER BY COUNT(*) DESC LIMIT :limit")
    suspend fun topClientNamesByCount(startMs: Long, endMs: Long, limit: Int): List<String>

    @Query("SELECT clientName FROM documents WHERE deletedAt IS NULL AND clientName != '' AND status IN ('PAGO') AND createdAt BETWEEN :startMs AND :endMs GROUP BY clientName ORDER BY SUM(total) DESC LIMIT :limit")
    suspend fun topClientNamesByTotal(startMs: Long, endMs: Long, limit: Int): List<String>

    @Query("SELECT COALESCE(SUM(total), 0.0) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND clientName = :clientName AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun sumTotalByClientAndPeriod(clientName: String, startMs: Long, endMs: Long): Double

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND clientName = :clientName AND createdAt BETWEEN :startMs AND :endMs")
    suspend fun countByClientAndPeriod(clientName: String, startMs: Long, endMs: Long): Int

    @Query("SELECT * FROM documents WHERE deletedAt IS NULL AND createdAt BETWEEN :startMs AND :endMs ORDER BY createdAt DESC")
    suspend fun getByPeriod(startMs: Long, endMs: Long): List<DocumentEntity>

    @Query("SELECT * FROM documents WHERE deletedAt IS NULL AND currency = :currency AND createdAt BETWEEN :startMs AND :endMs ORDER BY createdAt DESC")
    suspend fun getByPeriodAndCurrency(currency: String, startMs: Long, endMs: Long): List<DocumentEntity>

    @Query("SELECT * FROM documents WHERE deletedAt IS NULL ORDER BY createdAt DESC")
    suspend fun getAllNonDeleted(): List<DocumentEntity>
}