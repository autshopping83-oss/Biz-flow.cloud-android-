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

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND synced = 0")
    fun observePendingSyncCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM documents WHERE deletedAt IS NULL AND type = :type")
    suspend fun countByType(type: String): Int
}