package com.bizflow.cloud.data.remote

import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RemoteMappersTest {

    private val json = Json { encodeDefaults = false }

    private fun sampleEntity(created: Long = 1_700_000_000_000L): DocumentEntity =
        DocumentEntity(
            id = "doc-1",
            documentType = DocumentType.FATURA,
            number = "INV-001",
            date = "2026-08-31",
            dueDate = null,
            currency = "MZN",
            language = "pt",
            clientName = "ACME",
            clientContact = "+258 84 000 0000",
            clientWhatsApp = null,
            clientLocation = "Maputo",
            clientNuit = "123456789",
            companyName = null,
            companyAddress = null,
            companyNuit = null,
            companyContact = null,
            companyLogo = null,
            subtotal = 1000.0,
            taxRate = 16.0,
            taxAmount = 160.0,
            discount = 0.0,
            total = 1160.0,
            paymentMethod = null,
            stampText = "PAGO",
            signatureData = null,
            signaturePath = null,
            status = DocumentStatus.PENDENTE,
            documentTheme = "color",
            createdAt = created,
            pdfUrl = null,
            synced = false,
            updatedAt = created,
            deletedAt = null,
        )

    private fun sampleItems(): List<LineItemEntity> = listOf(
        LineItemEntity(
            id = "item-1",
            documentId = "doc-1",
            description = "Serviço A",
            quantity = 2.0,
            unitPrice = 500.0,
            total = 1000.0,
        ),
    )

    @Test
    fun `entidade documento roundtrip via DTO preserva campos e status`() {
        val entity = sampleEntity()
        val dto = entity.toRemoteDoc(sampleItems()).withUser("uid-1")
        val restored = dto.toEntity()

        assertEquals(entity.id, restored.id)
        assertEquals(DocumentType.FATURA, restored.documentType)
        assertEquals(entity.number, restored.number)
        assertEquals(entity.clientName, restored.clientName)
        assertEquals(entity.clientNuit, restored.clientNuit)
        assertEquals(entity.subtotal, restored.subtotal, 0.0)
        assertEquals(entity.total, restored.total, 0.0)
        assertEquals(DocumentStatus.PENDENTE, restored.status)
        assertEquals(entity.createdAt, restored.createdAt)
        assertEquals(entity.updatedAt, restored.updatedAt)
        assertTrue(restored.synced)
    }

    @Test
    fun `DTO documento serializa payload com chaves snake_case e user_id`() {
        val entity = sampleEntity()
        val dto = entity.toRemoteDoc(sampleItems()).withUser("uid-1")
        val payload = json.encodeToString(RemoteDocumentDto.serializer(), dto)

        assertTrue(payload.contains("\"client_name\""))
        assertTrue(payload.contains("\"user_id\":\"uid-1\""))
        assertTrue(payload.contains("\"unit_price\""))
        assertTrue(payload.contains("\"stamp_text\""))
        assertFalse(payload.contains("clientName"))
    }

    @Test
    fun `line items gerados de items JSONB tem ids estaveis`() {
        val entity = sampleEntity()
        val dto = entity.toRemoteDoc(sampleItems())
        val items = dto.toLineItems()

        assertEquals(1, items.size)
        assertEquals("Serviço A", items[0].description)
        assertEquals(2.0, items[0].quantity, 0.0)
        assertEquals(500.0, items[0].unitPrice, 0.0)
        assertEquals(1000.0, items[0].total, 0.0)
        assertEquals(stableItemUuid("doc-1", 0), items[0].id)
    }

    @Test
    fun `cliente roundtrip mantem dados e payload omite created quando nulo`() {
        val client = ClientEntity(
            id = "client-1",
            name = "ACME",
            contact = "+258 84 123 4567",
            nuit = "987654321",
            location = "Beira",
            userId = null,
            synced = false,
            createdAt = 1_700_000_000_000L,
            updatedAt = 1_700_000_000_000L,
            deletedAt = null,
        )

        val dto = client.toRemoteClient().withUser("uid-1")
        val restored = dto.toEntity()

        assertEquals(client.id, restored.id)
        assertEquals(client.name, restored.name)
        assertEquals(client.contact, restored.contact)
        assertEquals(client.nuit, restored.nuit)
        assertTrue(restored.synced)

        val payload = json.encodeToString(RemoteClientDto.serializer(), dto)
        assertTrue(payload.contains("\"name\":\"ACME\""))
        assertFalse(payload.contains("created_at"))
        assertFalse(payload.contains("updated_at"))
    }

    @Test
    fun `iso e epoch convertem de id e volta`() {
        val now = 1_700_000_000_000L
        assertEquals(now, isoToLong(longToIso(now)))
        assertEquals(0L, isoToLong("data invalida"))
    }

    @Test
    fun `status mapeiam para nomes armazenaveis`() {
        val emitted = sampleEntity().let {
            it.copy(updatedAt = 1_800_000_000_000L, status = DocumentStatus.EMITIDO)
        }
        val dto = emitted.toRemoteDoc(emptyList())
        assertEquals("EMITIDO", dto.status)
        assertEquals(DocumentStatus.EMITIDO, dto.toEntity().status)
    }

    @Test
    fun `items vazios mapeiam para json array vazio`() {
        val dto = sampleEntity().toRemoteDoc(emptyList())
        assertEquals(JsonArray(emptyList()), dto.items)
    }
}