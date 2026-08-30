package com.bizflow.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "company_settings")
data class CompanySettingsEntity(
    @PrimaryKey val id: String = DEFAULT_ID,
    val name: String,
    val address: String,
    val nuit: String,
    val contact: String,
    val logo: String?,
    val defaultTaxRate: Double,
    val currency: String,
    val language: String,
    val theme: String,
    val plan: String,
    val isAdmin: Boolean,
    val customStamp: String?,
    val signature: String?,
    val userPhone: String?,
    val userEmail: String?,
    val updatedAt: Long,
    val documentTemplateId: String = DEFAULT_TEMPLATE_ID,
) {
    companion object {
        const val DEFAULT_ID = "default"
        const val DEFAULT_TEMPLATE_ID = "template_1_modern"
    }
}