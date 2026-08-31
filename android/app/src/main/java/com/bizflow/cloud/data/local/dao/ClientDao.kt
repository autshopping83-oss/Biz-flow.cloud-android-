package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bizflow.cloud.data.local.entity.ClientEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ClientDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(client: ClientEntity)

    @Query("SELECT * FROM clients WHERE deletedAt IS NULL ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<ClientEntity>>

    @Query("SELECT * FROM clients WHERE deletedAt IS NULL AND id = :id")
    suspend fun getById(id: String): ClientEntity?

    @Query("SELECT * FROM clients WHERE id = :id")
    suspend fun getByIdIncludingDeleted(id: String): ClientEntity?

    @Query("UPDATE clients SET synced = 1, updatedAt = :now WHERE id = :id")
    suspend fun markSynced(id: String, now: Long)

    @Query("DELETE FROM clients WHERE userId = :userId")
    suspend fun clearForUser(userId: String)
}