package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bizflow.cloud.data.local.entity.LineItemEntity

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
}