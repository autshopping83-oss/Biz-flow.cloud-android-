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

    @Query("UPDATE clients SET deletedAt = :now, updatedAt = :now WHERE id = :id")
    suspend fun softDelete(id: Long, now: Long)

    @Query("SELECT * FROM clients WHERE deletedAt IS NULL ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<ClientEntity>>

    @Query("SELECT * FROM clients WHERE deletedAt IS NULL AND id = :id")
    suspend fun getById(id: Long): ClientEntity?
}