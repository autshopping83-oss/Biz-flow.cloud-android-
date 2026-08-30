package com.bizflow.cloud.data.local.model

import androidx.room.Embedded
import androidx.room.Relation
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity

data class DocumentWithItems(
    @Embedded val document: DocumentEntity,
    @Relation(parentColumn = "id", entityColumn = "documentId")
    val items: List<LineItemEntity>,
)