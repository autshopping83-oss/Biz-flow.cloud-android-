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
}