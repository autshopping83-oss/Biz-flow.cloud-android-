package com.bizflow.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "line_items",
    foreignKeys = [
        ForeignKey(
            entity = DocumentEntity::class,
            parentColumns = ["id"],
            childColumns = ["documentId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("documentId")],
)
data class LineItemEntity(
    @PrimaryKey val id: String,
    val documentId: String,
    val description: String,
    val quantity: Double,
    val unitPrice: Double,
    val total: Double,
)