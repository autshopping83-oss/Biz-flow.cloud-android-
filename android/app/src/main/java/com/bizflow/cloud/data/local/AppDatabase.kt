package com.bizflow.cloud.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
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
import java.util.UUID

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
    version = 7,
    exportSchema = true,
)
@TypeConverters(Converters::class)
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
                        "TEXT NOT NULL DEFAULT '${CompanySettingsEntity.DEFAULT_TEMPLATE_ID}'",
                )
            }
        }

        val MIGRATION_2_3: Migration = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE documents ADD COLUMN signaturePath TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN logoPath TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN stampPath TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN defaultSignaturePath TEXT")
            }
        }

        val MIGRATION_3_4: Migration = object : Migration(3, 4) {
            private val CLIENT_COLUMNS =
                "id, name, contact, nuit, location, userId, synced, createdAt, updatedAt, deletedAt"

            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE clients_new (" +
                        "id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, " +
                        "nuit TEXT NOT NULL, location TEXT NOT NULL, userId TEXT, " +
                        "synced INTEGER NOT NULL, createdAt INTEGER NOT NULL, " +
                        "updatedAt INTEGER NOT NULL, deletedAt INTEGER)",
                )
                db.query("SELECT $CLIENT_COLUMNS FROM clients").use { cursor ->
                    while (cursor.moveToNext()) {
                        db.execSQL(
                            "INSERT INTO clients_new ($CLIENT_COLUMNS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            clientRowBindings(cursor),
                        )
                    }
                }
                db.execSQL("DROP TABLE clients")
                db.execSQL("ALTER TABLE clients_new RENAME TO clients")
            }
        }

        val MIGRATION_4_5: Migration = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE company_settings ADD COLUMN tradingName TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN city TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN country TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN whatsApp TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN email TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN website TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN companyIdentifierType TEXT")
                db.execSQL("ALTER TABLE company_settings ADD COLUMN companyIdentifierValue TEXT")

                db.execSQL("ALTER TABLE documents ADD COLUMN companyTradingName TEXT")
                db.execSQL("ALTER TABLE documents ADD COLUMN companyCity TEXT")
                db.execSQL("ALTER TABLE documents ADD COLUMN companyCountry TEXT")
                db.execSQL("ALTER TABLE documents ADD COLUMN companyWhatsApp TEXT")
                db.execSQL("ALTER TABLE documents ADD COLUMN companyEmail TEXT")
                db.execSQL("ALTER TABLE documents ADD COLUMN companyWebsite TEXT")
                db.execSQL("ALTER TABLE documents ADD COLUMN companyIdentifierType TEXT")
                db.execSQL("ALTER TABLE documents ADD COLUMN companyIdentifierValue TEXT")
            }
        }

        val MIGRATION_5_6: Migration = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE documents ADD COLUMN userId TEXT")
                db.execSQL("ALTER TABLE sync_queue ADD COLUMN user_id TEXT")
            }
        }

        val MIGRATION_6_7: Migration = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE transactions ADD COLUMN documentId TEXT")
                db.execSQL("ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'MZN'")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_transactions_documentId ON transactions(documentId)")
            }
        }
    }
}

private fun clientRowBindings(cursor: android.database.Cursor): Array<Any?> {
    val oldId = cursor.getLong(cursor.getColumnIndexOrThrow("id"))
    val userId = nullableString(cursor, "userId")
    val deletedAt = nullableLong(cursor, "deletedAt")
    return arrayOf(
        stableClientUuid(oldId),
        cursor.getString(cursor.getColumnIndexOrThrow("name")),
        cursor.getString(cursor.getColumnIndexOrThrow("contact")),
        cursor.getString(cursor.getColumnIndexOrThrow("nuit")),
        cursor.getString(cursor.getColumnIndexOrThrow("location")),
        userId,
        cursor.getLong(cursor.getColumnIndexOrThrow("synced")),
        cursor.getLong(cursor.getColumnIndexOrThrow("createdAt")),
        cursor.getLong(cursor.getColumnIndexOrThrow("updatedAt")),
        deletedAt,
    )
}

private fun nullableString(cursor: android.database.Cursor, column: String): String? {
    val index = cursor.getColumnIndex(column)
    return if (index >= 0 && !cursor.isNull(index)) cursor.getString(index) else null
}

private fun nullableLong(cursor: android.database.Cursor, column: String): Long? {
    val index = cursor.getColumnIndex(column)
    return if (index >= 0 && !cursor.isNull(index)) cursor.getLong(index) else null
}

private fun stableClientUuid(oldId: Long): String =
    UUID.nameUUIDFromBytes("bizflow-client:$oldId".toByteArray()).toString()