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
}