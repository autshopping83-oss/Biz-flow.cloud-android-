package com.bizflow.cloud.data.sync

import android.content.SharedPreferences
import com.bizflow.cloud.data.local.dao.ClientDao
import com.bizflow.cloud.data.local.dao.DocumentDao
import com.bizflow.cloud.data.local.dao.LineItemDao
import com.bizflow.cloud.data.local.dao.SyncQueueDao
import com.bizflow.cloud.data.local.entity.SyncQueueEntity
import com.bizflow.cloud.data.remote.RemoteSync
import com.bizflow.cloud.data.remote.isoToLong
import com.bizflow.cloud.data.remote.toEntity
import com.bizflow.cloud.data.remote.toLineItems
import com.bizflow.cloud.data.remote.toRemoteClient
import com.bizflow.cloud.data.remote.toRemoteDoc
import kotlinx.coroutines.CancellationException

/**
 * Orquestra o sync offline-first:
 *  - push: outbox (sync_queue) via RemoteSync, removendo/corrigindo entradas;
 *  - pull: incremental por updated_at/created_at > lastPull (janela de overlap),
 *    com merge LWW por timestamp. Nao re-enfileira no outbox (evita loop).
 */
class SyncRepository(
    private val remoteSync: RemoteSync,
    private val syncQueueDao: SyncQueueDao,
    private val documentDao: DocumentDao,
    private val lineItemDao: LineItemDao,
    private val clientDao: ClientDao,
    private val prefs: SharedPreferences,
) {
    suspend fun syncNow(): Boolean {
        var ok = pushPending()
        ok = pull() && ok
        return ok
    }

    private suspend fun pushPending(): Boolean {
        val due = syncQueueDao.getDue(System.currentTimeMillis(), BATCH_SIZE)
        var allOk = true
        due.forEach { entry ->
            try {
                process(entry)
                syncQueueDao.remove(entry.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                allOk = false
                fail(entry, e.message ?: e.javaClass.simpleName)
            }
        }
        return allOk
    }

    private suspend fun process(entry: SyncQueueEntity) {
        when (entry.entityType) {
            SyncQueueEntity.TYPE_DOCUMENT -> processDocument(entry)
            SyncQueueEntity.TYPE_CLIENT -> processClient(entry)
            else -> error("Tipo de sync desconhecido: ${entry.entityType}")
        }
    }

    private suspend fun processDocument(entry: SyncQueueEntity) {
        if (entry.operation == SyncQueueEntity.OP_DELETE) {
            remoteSync.deleteDocument(entry.entityId)
            return
        }
        val doc = documentDao.getEntityById(entry.entityId)
        if (doc == null || doc.deletedAt != null) {
            remoteSync.deleteDocument(entry.entityId)
            return
        }
        val items = lineItemDao.getByDocument(doc.id)
        remoteSync.pushDocument(doc, items)
        documentDao.markSynced(doc.id, System.currentTimeMillis())
    }

    private suspend fun processClient(entry: SyncQueueEntity) {
        if (entry.operation == SyncQueueEntity.OP_DELETE) {
            remoteSync.deleteClient(entry.entityId)
            return
        }
        val client = clientDao.getByIdIncludingDeleted(entry.entityId)
        if (client == null || client.deletedAt != null) {
            remoteSync.deleteClient(entry.entityId)
            return
        }
        remoteSync.pushClient(client)
        clientDao.markSynced(client.id, System.currentTimeMillis())
    }

    private suspend fun fail(entry: SyncQueueEntity, error: String) {
        val backoff = RETRY_BASE_MS * (1L shl minOf(entry.retryCount, MAX_BACKOFF_EXP))
        syncQueueDao.markFailed(
            status = SyncQueueEntity.STATUS_FAILED,
            id = entry.id,
            nextRetryAt = System.currentTimeMillis() + backoff,
            error = error.take(MAX_ERROR_LEN),
        )
    }

    private suspend fun pull(): Boolean = try {
        val since = prefs.getLong(lastPullKey(), 0L) - OVERLAP_MS
        pullDocuments(since)
        pullClients(since)
        prefs.edit().putLong(lastPullKey(), System.currentTimeMillis()).apply()
        true
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        false
    }

    private suspend fun pullDocuments(since: Long) {
        remoteSync.pullDocuments(since).forEach { dto ->
            val local = documentDao.getEntityById(dto.id)
            if (local == null || local.updatedAt < isoToLong(dto.updatedAt)) {
                val entity = dto.toEntity()
                documentDao.upsert(entity)
                lineItemDao.deleteByDocument(dto.id)
                lineItemDao.upsertAll(dto.toLineItems())
            }
        }
    }

    private suspend fun pullClients(since: Long) {
        remoteSync.pullClients(since).forEach { dto ->
            val local = clientDao.getByIdIncludingDeleted(dto.id)
            val remoteTs = isoToLong(dto.updatedAt ?: dto.createdAt.orEmpty())
            if (local == null || local.updatedAt < remoteTs) {
                clientDao.upsert(dto.toEntity())
            }
        }
    }

    private fun lastPullKey(): String {
        val uid = runCatching { remoteSync.currentUserId() }.getOrNull() ?: "anon"
        return "last_pull_$uid"
    }

    companion object {
        private const val BATCH_SIZE = 50
        private const val OVERLAP_MS = 120_000L
        private const val RETRY_BASE_MS = 60_000L
        private const val MAX_BACKOFF_EXP = 6
        private const val MAX_ERROR_LEN = 200
    }
}