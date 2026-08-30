package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bizflow.cloud.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(product: ProductEntity)

    @Query("UPDATE products SET deletedAt = :now, updatedAt = :now WHERE id = :id")
    suspend fun softDelete(id: String, now: Long)

    @Query("SELECT * FROM products WHERE deletedAt IS NULL ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<ProductEntity>>
}