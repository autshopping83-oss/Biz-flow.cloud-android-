package com.bizflow.cloud.data.repository

import com.bizflow.cloud.data.local.dao.CompanySettingsDao
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import com.bizflow.cloud.data.model.CurrencyCatalog
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class CompanySettingsRepository(
    private val dao: CompanySettingsDao,
) {
    fun observe(): Flow<CompanySettingsEntity?> = dao.observe()

    fun observeDocumentTemplateId(): Flow<String> =
        dao.observeDocumentTemplateId().map { it ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID }

    suspend fun getSettings(): CompanySettingsEntity? = dao.get()

    suspend fun getDocumentTemplateId(): String =
        dao.get()?.documentTemplateId ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID

    suspend fun setDocumentTemplateId(templateId: String) {
        updateOrCreate { _, now ->
            dao.updateDocumentTemplateId(templateId, now)
        }
    }

    suspend fun setLogoPath(path: String?) {
        updateOrCreate { _, now -> dao.updateLogoPath(path, now) }
    }

    suspend fun setStampPath(path: String?) {
        updateOrCreate { _, now -> dao.updateStampPath(path, now) }
    }

    suspend fun setDefaultSignaturePath(path: String?) {
        updateOrCreate { _, now -> dao.updateDefaultSignaturePath(path, now) }
    }

    fun observeCurrency(): Flow<String> =
        dao.observeCurrency().map { it ?: CurrencyCatalog.DEFAULT_CODE }

    suspend fun getCurrency(): String =
        dao.get()?.currency ?: CurrencyCatalog.DEFAULT_CODE

    suspend fun setCurrency(currency: String) {
        updateOrCreate { _, now -> dao.updateCurrency(currency, now) }
    }

    private suspend fun updateOrCreate(update: suspend (CompanySettingsEntity?, Long) -> Unit) {
        val existing = dao.get()
        val now = System.currentTimeMillis()
        if (existing == null) {
            dao.upsert(defaultSettings(now))
            update(null, now)
        } else {
            update(existing, now)
        }
    }

    private fun defaultSettings(now: Long): CompanySettingsEntity {
        return CompanySettingsEntity(
            name = "",
            address = "",
            nuit = "",
            contact = "",
            logo = null,
            defaultTaxRate = 0.16,
            currency = CurrencyCatalog.DEFAULT_CODE,
            language = "pt",
            theme = "",
            plan = "",
            isAdmin = false,
            customStamp = null,
            signature = null,
            userPhone = null,
            userEmail = null,
            updatedAt = now,
        )
    }
}