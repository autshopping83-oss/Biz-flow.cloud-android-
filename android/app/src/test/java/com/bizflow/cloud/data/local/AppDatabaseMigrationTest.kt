package com.bizflow.cloud.data.local

import android.content.Context
import androidx.room.Room
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.sqlite.db.SupportSQLiteOpenHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.core.app.ApplicationProvider
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AppDatabaseMigrationTest {

    @Test
    fun migrateV2ToV3_preservesDataAndAddsColumns() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val name = "migration-test-v2.db"
        createV2Fixture(context, name)

        val db = Room.databaseBuilder(context, AppDatabase::class.java, name)
            .addMigrations(AppDatabase.MIGRATION_1_2, AppDatabase.MIGRATION_2_3)
            .build()

        assertEquals(3, db.openHelper.writableDatabase.version)

        val doc = db.documentDao().getById("doc-1")
        assertNotNull(doc)
        assertEquals("doc-1", doc!!.document.id)
        assertEquals(DocumentType.FATURA, doc.document.documentType)
        assertEquals(DocumentStatus.PAGO, doc.document.status)
        assertEquals(2, doc.items.size)

        val settings = db.companySettingsDao().get()
        assertNotNull(settings)
        assertEquals("Minha Empresa", settings!!.name)
        assertEquals("template_1_modern", settings.documentTemplateId)
        assertNull(settings.logoPath)

        val documentColumns = db.openHelper.writableDatabase
            .query("PRAGMA table_info(documents)")
            .use { c -> columnNames(c) }
        assertTrue("signaturePath", "signaturePath" in documentColumns)

        val settingsColumns = db.openHelper.writableDatabase
            .query("PRAGMA table_info(company_settings)")
            .use { c -> columnNames(c) }
        assertTrue("logoPath", "logoPath" in settingsColumns)
        assertTrue("stampPath", "stampPath" in settingsColumns)
        assertTrue("defaultSignaturePath", "defaultSignaturePath" in settingsColumns)

        db.close()
    }

    @Test
    fun missingMigration_throwsInsteadOfDestructiveFallback() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val name = "migration-test-missing.db"
        createV2Fixture(context, name)

        val db = Room.databaseBuilder(context, AppDatabase::class.java, name).build()

        assertThrows(IllegalStateException::class.java) {
            db.openHelper.writableDatabase
        }
        db.close()
    }

    private fun columnNames(cursor: android.database.Cursor): List<String> {
        val names = mutableListOf<String>()
        while (cursor.moveToNext()) {
            names += cursor.getString(cursor.getColumnIndexOrThrow("name"))
        }
        return names
    }

    private fun createV2Fixture(context: Context, name: String) {
        val helper: SupportSQLiteOpenHelper = FrameworkSQLiteOpenHelperFactory().create(
            SupportSQLiteOpenHelper.Configuration.builder(context)
                .name(name)
                .callback(object : SupportSQLiteOpenHelper.Callback(2) {
                    override fun onCreate(db: SupportSQLiteDatabase) = createV2Schema(db)

                    override fun onUpgrade(
                        db: SupportSQLiteDatabase,
                        oldVersion: Int,
                        newVersion: Int,
                    ) = Unit
                })
                .build(),
        )
        helper.writableDatabase.use { db -> seedV2Data(db) }
    }

    private fun createV2Schema(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE company_settings (" +
                "id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, " +
                "nuit TEXT NOT NULL, contact TEXT NOT NULL, logo TEXT, " +
                "defaultTaxRate REAL NOT NULL, currency TEXT NOT NULL, language TEXT NOT NULL, " +
                "theme TEXT NOT NULL, plan TEXT NOT NULL, isAdmin INTEGER NOT NULL, " +
                "customStamp TEXT, signature TEXT, userPhone TEXT, userEmail TEXT, " +
                "updatedAt INTEGER NOT NULL, " +
                "documentTemplateId TEXT NOT NULL DEFAULT 'template_1_modern')",
        )
        db.execSQL(
            "CREATE TABLE documents (" +
                "id TEXT NOT NULL PRIMARY KEY, type TEXT NOT NULL, number TEXT NOT NULL, " +
                "date TEXT NOT NULL, dueDate TEXT, currency TEXT NOT NULL, language TEXT NOT NULL, " +
                "clientName TEXT NOT NULL, clientContact TEXT NOT NULL, clientWhatsApp TEXT, " +
                "clientLocation TEXT NOT NULL, clientNuit TEXT NOT NULL, companyName TEXT, " +
                "companyAddress TEXT, companyNuit TEXT, companyContact TEXT, companyLogo TEXT, " +
                "subtotal REAL NOT NULL, taxRate REAL NOT NULL, taxAmount REAL NOT NULL, " +
                "discount REAL NOT NULL, total REAL NOT NULL, paymentMethod TEXT, " +
                "stampText TEXT, signatureData TEXT, status TEXT NOT NULL, " +
                "documentTheme TEXT, createdAt INTEGER NOT NULL, pdfUrl TEXT, " +
                "synced INTEGER NOT NULL, updatedAt INTEGER NOT NULL, deletedAt INTEGER)",
        )
        db.execSQL(
            "CREATE TABLE line_items (" +
                "id TEXT NOT NULL PRIMARY KEY, documentId TEXT NOT NULL, description TEXT NOT NULL, " +
                "quantity REAL NOT NULL, unitPrice REAL NOT NULL, total REAL NOT NULL)",
        )
        db.execSQL(
            "CREATE TABLE clients (" +
                "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, " +
                "contact TEXT NOT NULL, nuit TEXT NOT NULL, location TEXT NOT NULL, " +
                "userId TEXT, synced INTEGER NOT NULL, createdAt INTEGER NOT NULL, " +
                "updatedAt INTEGER NOT NULL, deletedAt INTEGER)",
        )
        db.execSQL(
            "CREATE TABLE products (" +
                "id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, " +
                "category TEXT, userId TEXT, createdAt INTEGER NOT NULL, " +
                "updatedAt INTEGER NOT NULL, deletedAt INTEGER)",
        )
        db.execSQL(
            "CREATE TABLE transactions (" +
                "id TEXT NOT NULL PRIMARY KEY, userId TEXT, type TEXT NOT NULL, " +
                "amount REAL NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, " +
                "date TEXT NOT NULL, timestamp INTEGER NOT NULL, receiptId TEXT, " +
                "synced INTEGER NOT NULL, updatedAt INTEGER NOT NULL, deletedAt INTEGER)",
        )
        db.execSQL(
            "CREATE TABLE sync_queue (" +
                "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, entityType TEXT NOT NULL, " +
                "entityId TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT, " +
                "status TEXT NOT NULL, retryCount INTEGER NOT NULL, nextRetryAt INTEGER NOT NULL, " +
                "createdAt INTEGER NOT NULL, lastError TEXT)",
        )
    }

    private fun seedV2Data(db: SupportSQLiteDatabase) {
        db.execSQL(
            "INSERT INTO company_settings (id, name, address, nuit, contact, defaultTaxRate, " +
                "currency, language, theme, plan, isAdmin, updatedAt, documentTemplateId) " +
                "VALUES ('default', 'Minha Empresa', 'Maputo', 'NUIT123', '842000000', 0.16, " +
                "'MZN', 'pt', 'modern', 'pro', 1, 1234567890, 'template_1_modern')",
        )
        db.execSQL(
            "INSERT INTO documents (id, type, number, date, currency, language, clientName, " +
                "clientContact, clientLocation, clientNuit, subtotal, taxRate, taxAmount, " +
                "discount, total, status, createdAt, synced, updatedAt) " +
                "VALUES ('doc-1', 'INVOICE', 'FT-001', '2024-01-01', 'MZN', 'pt', " +
                "'Cliente A', '840000000', 'Beira', '111', 100, 0.16, 16, 0, 116, " +
                "'PAID', 1700000000000, 0, 1700000000000)",
        )
        db.execSQL(
            "INSERT INTO line_items (id, documentId, description, quantity, unitPrice, total) " +
                "VALUES ('item-1', 'doc-1', 'Servico', 1, 100, 100)",
        )
        db.execSQL(
            "INSERT INTO line_items (id, documentId, description, quantity, unitPrice, total) " +
                "VALUES ('item-2', 'doc-1', 'Produto', 2, 10, 20)",
        )
    }
}