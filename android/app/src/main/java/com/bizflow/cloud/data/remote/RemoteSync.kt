package com.bizflow.cloud.data.remote

import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order

/**
 * Operacoes PostgREST (push/pull incrementais) contra o Supabase.
 * Sempre user-scoped via RLS; `user_id` e' preenchido com o uid da sessao.
 */
class RemoteSync(private val supabase: SupabaseClient) {

    suspend fun pushDocument(document: DocumentEntity, items: List<LineItemEntity>) {
        val uid = currentUserId()
        val dto = document.toRemoteDoc(items).withUser(uid)
        supabase.from("documents").upsert(listOf(dto), onConflict = "id", defaultToNull = false)
    }

    suspend fun deleteDocument(id: String) {
        supabase.from("documents").delete { filter { eq("id", id) } }
    }

    suspend fun pullDocuments(sinceEpochMillis: Long): List<RemoteDocumentDto> {
        val result = supabase.from("documents").select {
            filter { gte("updated_at", longToIso(sinceEpochMillis)) }
            order("updated_at", Order.ASCENDING)
            limit(1000L)
        }
        return result.decodeList()
    }

    suspend fun pushClient(client: ClientEntity) {
        val uid = currentUserId()
        val dto = client.toRemoteClient().withUser(uid)
        supabase.from("saved_clients").upsert(listOf(dto), onConflict = "id", defaultToNull = false)
    }

    suspend fun deleteClient(id: String) {
        supabase.from("saved_clients").delete { filter { eq("id", id) } }
    }

    suspend fun pullClients(sinceEpochMillis: Long): List<RemoteClientDto> {
        val result = supabase.from("saved_clients").select {
            filter { gte("created_at", longToIso(sinceEpochMillis)) }
            order("created_at", Order.ASCENDING)
            limit(1000L)
        }
        return result.decodeList()
    }

    suspend fun currentUserId(): String =
        supabase.auth.currentSessionOrNull()?.user?.id ?: error("Sessao Supabase ausente")
}