package com.bizflow.cloud

import android.app.Application
import androidx.room.Room
import com.bizflow.cloud.data.local.AppDatabase
import com.bizflow.cloud.data.repository.ClientRepository
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.PdfGeneratorRepositoryImpl

class BizFlowApplication : Application() {
    val database: AppDatabase by lazy {
        Room.databaseBuilder(this, AppDatabase::class.java, "bizflow.db")
            .addMigrations(AppDatabase.MIGRATION_1_2)
            .addMigrations(AppDatabase.MIGRATION_2_3)
            .fallbackToDestructiveMigration()
            .build()
    }

    val documentRepository: DocumentRepository by lazy {
        DocumentRepository(database.documentDao(), database.lineItemDao())
    }

    val clientRepository: ClientRepository by lazy {
        ClientRepository(database.clientDao())
    }

    val companySettingsRepository: CompanySettingsRepository by lazy {
        CompanySettingsRepository(database.companySettingsDao())
    }

    val pdfGeneratorRepository: PdfGeneratorRepositoryImpl by lazy {
        PdfGeneratorRepositoryImpl(
            applicationContext = this,
            companySettingsRepository = companySettingsRepository,
        )
    }
}

val Context.bizFlowDatabase: AppDatabase
    get() = (applicationContext as BizFlowApplication).database