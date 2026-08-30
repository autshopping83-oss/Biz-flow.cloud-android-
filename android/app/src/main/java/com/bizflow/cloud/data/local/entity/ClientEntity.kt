package com.bizflow.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "clients")
data class ClientEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val contact: String,
    val nuit: String,
    val location: String,
    val userId: String?,
    val synced: Boolean,
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
)