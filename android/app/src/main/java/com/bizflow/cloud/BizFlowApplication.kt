package com.bizflow.cloud

import android.app.Application
import android.content.Context
import androidx.room.Room
import com.bizflow.cloud.data.local.AppDatabase
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.PdfGeneratorRepository

class BizFlowApplication : Application() {
    val database: AppDatabase by lazy {
        Room.databaseBuilder(this, AppDatabase::class.java, "bizflow.db")
            .addMigrations(AppDatabase.MIGRATION_1_2)
            .fallbackToDestructiveMigration()
            .build()
    }

    val documentRepository: DocumentRepository by lazy {
        DocumentRepository(database.documentDao(), database.lineItemDao())
    }

    val companySettingsRepository: CompanySettingsRepository by lazy {
        CompanySettingsRepository(database.companySettingsDao())
    }

    val pdfGeneratorRepository: PdfGeneratorRepository by lazy {
        PdfGeneratorRepository(companySettingsRepository)
    }
}

val Context.bizFlowDatabase: AppDatabase
    get() = (applicationContext as BizFlowApplication).database