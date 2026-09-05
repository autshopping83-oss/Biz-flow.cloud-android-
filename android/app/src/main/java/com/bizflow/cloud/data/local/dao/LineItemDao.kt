package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.local.model.ProductAggregation

@Dao
interface LineItemDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<LineItemEntity>)

    @Query("SELECT * FROM line_items WHERE documentId = :documentId")
    suspend fun getByDocument(documentId: String): List<LineItemEntity>

    @Query("DELETE FROM line_items WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM line_items WHERE documentId = :documentId")
    suspend fun deleteByDocument(documentId: String)

    @Query("DELETE FROM line_items WHERE documentId IN (SELECT id FROM documents WHERE userId = :userId)")
    suspend fun clearForUser(userId: String)

    @Query("SELECT description, SUM(quantity) as quantity, SUM(total) as total FROM line_items WHERE documentId IN (SELECT id FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND createdAt BETWEEN :startMs AND :endMs) GROUP BY description ORDER BY total DESC LIMIT :limit")
    suspend fun topProductsByTotal(startMs: Long, endMs: Long, limit: Int): List<ProductAggregation>

    @Query("SELECT description, SUM(quantity) as quantity, SUM(total) as total FROM line_items WHERE documentId IN (SELECT id FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND currency = :currency AND createdAt BETWEEN :startMs AND :endMs) GROUP BY description ORDER BY total DESC LIMIT :limit")
    suspend fun topProductsByTotalAndCurrency(currency: String, startMs: Long, endMs: Long, limit: Int): List<ProductAggregation>

    @Query("SELECT description, SUM(quantity) as quantity, SUM(total) as total FROM line_items WHERE documentId IN (SELECT id FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND createdAt BETWEEN :startMs AND :endMs) GROUP BY description ORDER BY quantity DESC LIMIT :limit")
    suspend fun topProductsByQuantity(startMs: Long, endMs: Long, limit: Int): List<ProductAggregation>

    @Query("SELECT description, SUM(quantity) as quantity, SUM(total) as total FROM line_items WHERE documentId IN (SELECT id FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND createdAt BETWEEN :startMs AND :endMs)")
    suspend fun allProductsAggregated(startMs: Long, endMs: Long): List<ProductAggregation>

    @Query("SELECT description, SUM(quantity) as quantity, SUM(total) as total FROM line_items WHERE documentId IN (SELECT id FROM documents WHERE deletedAt IS NULL AND status IN ('PAGO') AND currency = :currency AND createdAt BETWEEN :startMs AND :endMs)")
    suspend fun allProductsAggregatedByCurrency(currency: String, startMs: Long, endMs: Long): List<ProductAggregation>
}