package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.ProductDao
import com.bizflow.cloud.data.local.dao.SyncQueueDao
import com.bizflow.cloud.data.local.entity.ProductEntity
import com.bizflow.cloud.data.local.entity.SyncQueueEntity
import kotlinx.coroutines.flow.Flow

class ProductRepository(
    private val productDao: ProductDao,
    private val syncQueueDao: SyncQueueDao,
    private val userIdProvider: () -> String? = { null },
) {
    fun observeAll(): Flow<List<ProductEntity>> = productDao.observeAll()

    suspend fun save(product: ProductEntity) {
        val uid = userIdProvider()
        val owned = if (uid != null && product.userId == null) product.copy(userId = uid) else product
        productDao.upsert(owned)
        syncQueueDao.insert(
            SyncQueueEntity.pending(
                userId = uid,
                entityType = "PRODUCT",
                entityId = owned.id,
                operation = SyncQueueEntity.OP_UPSERT,
                now = System.currentTimeMillis(),
            ),
        )
    }

    suspend fun softDelete(id: String) {
        productDao.softDelete(id, System.currentTimeMillis())
        syncQueueDao.insert(
            SyncQueueEntity.pending(
                userId = userIdProvider(),
                entityType = "PRODUCT",
                entityId = id,
                operation = SyncQueueEntity.OP_DELETE,
                now = System.currentTimeMillis(),
            ),
        )
    }
}
