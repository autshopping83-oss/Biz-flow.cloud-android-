package com.bizflow.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sync_queue",
    indices = [Index("entityType", "entityId")],
)
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String,
    val entityId: String,
    val operation: String,
    val payload: String? = null,
    val status: String,
    val retryCount: Int,
    val nextRetryAt: Long,
    val createdAt: Long,
    val lastError: String? = null,
) {
    companion object {
        const val OP_UPSERT = "UPSERT"
        const val OP_DELETE = "DELETE"
        const val STATUS_PENDING = "PENDING"
        const val STATUS_SYNCING = "SYNCING"
        const val STATUS_SYNCED = "SYNCED"
        const val STATUS_FAILED = "FAILED"

        const val TYPE_DOCUMENT = "DOCUMENT"
        const val TYPE_CLIENT = "CLIENT"

        fun pending(entityType: String, entityId: String, operation: String, now: Long): SyncQueueEntity =
            SyncQueueEntity(
                entityType = entityType,
                entityId = entityId,
                operation = operation,
                status = STATUS_PENDING,
                retryCount = 0,
                nextRetryAt = 0L,
                createdAt = now,
            )
    }
}