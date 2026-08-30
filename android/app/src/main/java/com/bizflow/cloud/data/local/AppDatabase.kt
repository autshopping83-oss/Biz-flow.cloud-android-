package com.bizflow.cloud.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.bizflow.cloud.data.local.dao.ClientDao
import com.bizflow.cloud.data.local.dao.CompanySettingsDao
import com.bizflow.cloud.data.local.dao.DocumentDao
import com.bizflow.cloud.data.local.dao.LineItemDao
import com.bizflow.cloud.data.local.dao.ProductDao
import com.bizflow.cloud.data.local.dao.SyncQueueDao
import com.bizflow.cloud.data.local.dao.TransactionDao
import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.local.entity.ProductEntity
import com.bizflow.cloud.data.local.entity.SyncQueueEntity
import com.bizflow.cloud.data.local.entity.TransactionEntity

@Database(
    entities = [
        DocumentEntity::class,
        LineItemEntity::class,
        ClientEntity::class,
        ProductEntity::class,
        TransactionEntity::class,
        CompanySettingsEntity::class,
        SyncQueueEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun documentDao(): DocumentDao
    abstract fun lineItemDao(): LineItemDao
    abstract fun clientDao(): ClientDao
    abstract fun productDao(): ProductDao
    abstract fun transactionDao(): TransactionDao
    abstract fun companySettingsDao(): CompanySettingsDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        val MIGRATION_1_2: Migration = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "ALTER TABLE company_settings ADD COLUMN documentTemplateId " +
                        "TEXT NOT NULL DEFAULT '${CompanySettingsEntity.DEFAULT_TEMPLATE_ID}'"
                )
            }
        }
    }
}