package com.bizflow.cloud

import android.app.Application
import androidx.room.Room
import com.bizflow.cloud.data.auth.AuthManager
import com.bizflow.cloud.data.local.AppDatabase
import com.bizflow.cloud.data.remote.RemoteSync
import com.bizflow.cloud.data.remote.SupabaseClientProvider
import com.bizflow.cloud.data.repository.ClientRepository
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.PdfGeneratorRepositoryImpl
import com.bizflow.cloud.data.sync.SyncRepository
import com.bizflow.cloud.data.sync.SyncScheduler
import io.github.jan.supabase.SupabaseClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class BizFlowApplication : Application() {

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val database: AppDatabase by lazy {
        Room.databaseBuilder(this, AppDatabase::class.java, "bizflow.db")
            .addMigrations(AppDatabase.MIGRATION_1_2)
            .addMigrations(AppDatabase.MIGRATION_2_3)
            .addMigrations(AppDatabase.MIGRATION_3_4)
            .build()
    }

    val documentRepository: DocumentRepository by lazy {
        DocumentRepository(database.documentDao(), database.lineItemDao(), database.syncQueueDao())
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

    val supabaseClient: SupabaseClient? by lazy { SupabaseClientProvider.create() }

    val authManager: AuthManager by lazy { AuthManager(supabaseClient) }

    val syncRepository: SyncRepository? by lazy {
        supabaseClient?.let { client ->
            SyncRepository(
                remoteSync = RemoteSync(client),
                syncQueueDao = database.syncQueueDao(),
                documentDao = database.documentDao(),
                lineItemDao = database.lineItemDao(),
                clientDao = database.clientDao(),
                prefs = getSharedPreferences("bizflow_sync", MODE_PRIVATE),
            )
        }
    }

    override fun onCreate() {
        super.onCreate()
        applicationScope.launch { authManager.awaitReady() }
        SyncScheduler.schedule(this)
    }
}