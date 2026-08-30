package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.CompanySettingsDao
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class CompanySettingsRepository(
    private val dao: CompanySettingsDao,
) {
    fun observeDocumentTemplateId(): Flow<String> =
        dao.observeDocumentTemplateId().map { it ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID }

    suspend fun getDocumentTemplateId(): String =
        dao.get()?.documentTemplateId ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID

    suspend fun setDocumentTemplateId(templateId: String) {
        val existing = dao.get()
        if (existing == null) {
            dao.upsert(defaultSettings(templateId))
        } else {
            dao.updateDocumentTemplateId(templateId, System.currentTimeMillis())
        }
    }

    private fun defaultSettings(templateId: String): CompanySettingsEntity {
        return CompanySettingsEntity(
            name = "",
            address = "",
            nuit = "",
            contact = "",
            logo = null,
            defaultTaxRate = 0.16,
            currency = "MZN",
            language = "pt",
            theme = "",
            plan = "",
            isAdmin = false,
            customStamp = null,
            signature = null,
            userPhone = null,
            userEmail = null,
            updatedAt = System.currentTimeMillis(),
            documentTemplateId = templateId,
        )
    }
}