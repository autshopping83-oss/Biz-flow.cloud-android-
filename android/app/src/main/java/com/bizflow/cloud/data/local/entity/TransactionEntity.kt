package com.bizflow.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "transactions",
    indices = [Index("receiptId")],
)
data class TransactionEntity(
    @PrimaryKey val id: String,
    val userId: String?,
    val type: String,
    val amount: Double,
    val description: String,
    val category: String,
    val date: String,
    val timestamp: Long,
    val receiptId: String?,
    val synced: Boolean,
    val updatedAt: Long,
    val deletedAt: Long?,
)