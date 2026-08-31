package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.bizflow.cloud.data.local.entity.SyncQueueEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncQueueDao {
    @Insert
    suspend fun insert(entry: SyncQueueEntity): Long

    @Query(
        "SELECT * FROM sync_queue WHERE user_id = :userId AND status IN ('PENDING','FAILED') " +
            "AND nextRetryAt <= :now ORDER BY createdAt LIMIT :limit",
    )
    suspend fun getDue(userId: String, now: Long, limit: Int): List<SyncQueueEntity>

    @Query(
        "UPDATE sync_queue SET status = :status, retryCount = retryCount + 1, " +
            "nextRetryAt = :nextRetryAt, lastError = :error WHERE id = :id",
    )
    suspend fun markFailed(status: String, id: Long, nextRetryAt: Long, error: String?)

    @Query("UPDATE sync_queue SET status = :status WHERE id = :id")
    suspend fun markStatus(id: Long, status: String)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun remove(id: Long)

    @Query("DELETE FROM sync_queue WHERE status = 'SYNCED'")
    suspend fun clearSynced()

    @Query("DELETE FROM sync_queue WHERE user_id = :userId")
    suspend fun clearForUser(userId: String)

    @Query("SELECT COUNT(*) FROM sync_queue WHERE user_id = :userId AND status = 'PENDING'")
    fun observePendingCount(userId: String): Flow<Int>
}