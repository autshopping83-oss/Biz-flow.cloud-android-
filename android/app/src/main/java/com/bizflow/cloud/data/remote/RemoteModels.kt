package com.bizflow.cloud.data.remote

import com.bizflow.cloud.data.model.DocumentStatus
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import java.time.Instant

/**
 * Contrato com a tabela public.documents (Supabase).
 * Os nomes @SerialName refletem as colunas snake_case do schema cloud.
 * `items` e' o payload JSONB: [{description, quantity, unit_price, total}].
 */
@Serializable
data class RemoteDocumentDto(
    val id: String,
    val type: String,
    val number: String,
    val date: String,
    @SerialName("client_name") val clientName: String,
    @SerialName("user_id") val userId: String = "",
    val currency: String = "MZN",
    val language: String = "pt",
    @SerialName("client_contact") val clientContact: String = "",
    @SerialName("client_location") val clientLocation: String = "",
    @SerialName("client_nuit") val clientNuit: String = "",
    val items: JsonArray = JsonArray(emptyList()),
    val subtotal: Double = 0.0,
    @SerialName("tax_rate") val taxRate: Double = 0.0,
    @SerialName("tax_amount") val taxAmount: Double = 0.0,
    val discount: Double = 0.0,
    val total: Double = 0.0,
    @SerialName("stamp_text") val stampText: String? = null,
    @SerialName("signature_data") val signatureData: String? = null,
    @SerialName("document_theme") val documentTheme: String? = null,
    @SerialName("pdf_url") val pdfUrl: String? = null,
    val synced: Boolean = true,
    val status: String = DocumentStatus.PENDENTE.name,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
) {
    fun withUser(userId: String): RemoteDocumentDto = copy(userId = userId, synced = true)
}

/**
 * Contrato com a tabela public.saved_clients (Supabase).
 * Nota: saved_clients nao tem updated_at; as escritas enviam apenas as colunas existentes
 * (id/name/contact/location/nuit/user_id), omitindo create/update.
 */
@Serializable
data class RemoteClientDto(
    val id: String,
    val name: String,
    @SerialName("user_id") val userId: String = "",
    val contact: String = "",
    val location: String = "",
    val nuit: String = "",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
) {
    fun withUser(userId: String): RemoteClientDto = copy(userId = userId)
}

internal fun longToIso(epochMillis: Long): String = Instant.ofEpochMilli(epochMillis).toString()

internal fun isoToLong(iso: String): Long = try {
    Instant.parse(iso).toEpochMilli()
} catch (e: Exception) {
    0L
}