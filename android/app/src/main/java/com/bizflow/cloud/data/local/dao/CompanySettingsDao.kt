package com.bizflow.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CompanySettingsDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(settings: CompanySettingsEntity)

    @Query("SELECT * FROM company_settings WHERE id = 'default'")
    fun observe(): Flow<CompanySettingsEntity?>

    @Query("SELECT * FROM company_settings WHERE id = 'default'")
    suspend fun get(): CompanySettingsEntity?

    @Query("SELECT documentTemplateId FROM company_settings WHERE id = 'default'")
    fun observeDocumentTemplateId(): Flow<String?>

    @Query("UPDATE company_settings SET documentTemplateId = :templateId, updatedAt = :now WHERE id = 'default'")
    suspend fun updateDocumentTemplateId(templateId: String, now: Long)

    @Query("UPDATE company_settings SET logoPath = :path, updatedAt = :now WHERE id = 'default'")
    suspend fun updateLogoPath(path: String?, now: Long)

    @Query("UPDATE company_settings SET stampPath = :path, updatedAt = :now WHERE id = 'default'")
    suspend fun updateStampPath(path: String?, now: Long)

    @Query("UPDATE company_settings SET defaultSignaturePath = :path, updatedAt = :now WHERE id = 'default'")
    suspend fun updateDefaultSignaturePath(path: String?, now: Long)

    @Query("SELECT currency FROM company_settings WHERE id = 'default'")
    fun observeCurrency(): Flow<String?>

    @Query("UPDATE company_settings SET currency = :currency, updatedAt = :now WHERE id = 'default'")
    suspend fun updateCurrency(currency: String, now: Long)

    @Query(
        """UPDATE company_settings SET
            name = :name, tradingName = :tradingName, address = :address,
            city = :city, country = :country,
            companyIdentifierType = :identifierType, companyIdentifierValue = :identifierValue,
            contact = :contact, whatsApp = :whatsApp, email = :email, website = :website,
            updatedAt = :now
            WHERE id = 'default'""",
    )
    suspend fun updateCompanyProfile(
        name: String,
        tradingName: String?,
        address: String,
        city: String?,
        country: String?,
        identifierType: String?,
        identifierValue: String?,
        contact: String,
        whatsApp: String?,
        email: String?,
        website: String?,
        now: Long,
    )
}
