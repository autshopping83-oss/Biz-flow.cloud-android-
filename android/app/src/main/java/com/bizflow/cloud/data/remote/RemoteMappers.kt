package com.bizflow.cloud.data.remote

import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.util.UUID

fun DocumentEntity.toRemoteDoc(items: List<LineItemEntity>): RemoteDocumentDto =
    RemoteDocumentDto(
        id = id,
        type = documentType.code,
        number = number,
        date = date,
        currency = currency,
        language = language,
        clientName = clientName,
        clientContact = clientContact,
        clientLocation = clientLocation,
        clientNuit = clientNuit,
        items = items.toRemoteItems(),
        subtotal = subtotal,
        taxRate = taxRate,
        taxAmount = taxAmount,
        discount = discount,
        total = total,
        stampText = stampText,
        signatureData = signatureData,
        documentTheme = documentTheme,
        pdfUrl = pdfUrl,
        synced = true,
        status = status.name,
        createdAt = longToIso(createdAt),
        updatedAt = longToIso(updatedAt),
    )

fun RemoteDocumentDto.toEntity(): DocumentEntity =
    DocumentEntity(
        id = id,
        documentType = DocumentType.fromCode(type),
        number = number,
        date = date,
        dueDate = null,
        currency = currency,
        language = language,
        clientName = clientName,
        clientContact = clientContact,
        clientWhatsApp = null,
        clientLocation = clientLocation,
        clientNuit = clientNuit,
        companyName = null,
        companyAddress = null,
        companyNuit = null,
        companyContact = null,
        companyLogo = null,
        subtotal = subtotal,
        taxRate = taxRate,
        taxAmount = taxAmount,
        discount = discount,
        total = total,
        paymentMethod = null,
        stampText = stampText,
        signatureData = signatureData,
        signaturePath = null,
        status = DocumentStatus.fromStorage(status),
        documentTheme = documentTheme,
        createdAt = isoToLong(createdAt),
        pdfUrl = pdfUrl,
        synced = true,
        updatedAt = isoToLong(updatedAt),
        deletedAt = null,
    )

fun RemoteDocumentDto.toLineItems(): List<LineItemEntity> =
    items.mapIndexed { index, element ->
        val obj = element.jsonObject
        LineItemEntity(
            id = stableItemUuid(id, index),
            documentId = id,
            description = obj.stringOr("description"),
            quantity = obj.numberOr("quantity"),
            unitPrice = obj.numberOr("unit_price"),
            total = obj.numberOr("total"),
        )
    }

fun ClientEntity.toRemoteClient(): RemoteClientDto =
    RemoteClientDto(
        id = id,
        name = name,
        contact = contact,
        location = location,
        nuit = nuit,
    )

fun RemoteClientDto.toEntity(): ClientEntity =
    ClientEntity(
        id = id,
        name = name,
        contact = contact,
        nuit = nuit,
        location = location,
        userId = null,
        synced = true,
        createdAt = isoToLong(createdAt ?: updatedAt ?: "1970-01-01T00:00:00Z"),
        updatedAt = isoToLong(updatedAt ?: createdAt ?: "1970-01-01T00:00:00Z"),
        deletedAt = null,
    )

private fun List<LineItemEntity>.toRemoteItems(): JsonArray = buildJsonArray {
    forEach { line ->
        add(
            buildJsonObject {
                put("description", line.description)
                put("quantity", JsonPrimitive(line.quantity))
                put("unit_price", JsonPrimitive(line.unitPrice))
                put("total", JsonPrimitive(line.total))
            },
        )
    }
}

private fun JsonObject.stringOr(key: String): String =
    this[key]?.jsonPrimitive?.contentOrNull ?: ""

private fun JsonObject.numberOr(key: String): Double =
    this[key]?.jsonPrimitive?.doubleOrNull ?: 0.0

internal fun stableItemUuid(documentId: String, index: Int): String =
    UUID.nameUUIDFromBytes("bizflow-item:$documentId:$index".toByteArray()).toString()