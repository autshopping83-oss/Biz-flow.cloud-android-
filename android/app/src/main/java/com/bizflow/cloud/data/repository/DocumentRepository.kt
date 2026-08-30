package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.DocumentDao
import com.bizflow.cloud.data.local.dao.LineItemDao
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.local.model.DocumentWithItems
import com.bizflow.cloud.data.model.DocumentType
import kotlinx.coroutines.flow.Flow

class DocumentRepository(
    private val documentDao: DocumentDao,
    private val lineItemDao: LineItemDao,
) {
    fun observeAll(): Flow<List<DocumentWithItems>> = documentDao.observeAll()

    fun observeById(id: String): Flow<DocumentWithItems?> = documentDao.observeById(id)

    fun observePendingSyncCount(): Flow<Int> = documentDao.observePendingSyncCount()

    suspend fun nextNumber(type: DocumentType): String {
        val sequence = documentDao.countByType(type.code) + 1
        return "${type.prefix}-${sequence.toString().padStart(3, '0')}"
    }

    suspend fun save(document: DocumentEntity, items: List<LineItemEntity>) {
        lineItemDao.deleteByDocument(document.id)
        documentDao.upsert(document)
        lineItemDao.upsertAll(items)
    }

    suspend fun softDelete(id: String) {
        documentDao.softDelete(id, System.currentTimeMillis())
    }
}