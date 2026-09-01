package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.ClientDao
import com.bizflow.cloud.data.local.dao.SyncQueueDao
import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.local.entity.SyncQueueEntity
import kotlinx.coroutines.flow.Flow

class ClientRepository(
    private val clientDao: ClientDao,
    private val syncQueueDao: SyncQueueDao,
    private val userIdProvider: () -> String? = { null },
) {
    fun observeAll(): Flow<List<ClientEntity>> = clientDao.observeAll()

    suspend fun getById(id: String): ClientEntity? = clientDao.getById(id)

    suspend fun save(client: ClientEntity) {
        val uid = userIdProvider()
        val owned = if (uid != null && client.userId == null) client.copy(userId = uid) else client
        clientDao.upsert(owned)
        syncQueueDao.insert(
            SyncQueueEntity.pending(
                userId = uid,
                entityType = SyncQueueEntity.TYPE_CLIENT,
                entityId = owned.id,
                operation = SyncQueueEntity.OP_UPSERT,
                now = System.currentTimeMillis(),
            ),
        )
    }
}