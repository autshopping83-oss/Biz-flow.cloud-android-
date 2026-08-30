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
}