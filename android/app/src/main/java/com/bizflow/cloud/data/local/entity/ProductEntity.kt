package com.bizflow.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val price: Double,
    val category: String?,
    val userId: String?,
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long?,
)