package com.bizflow.cloud

import android.app.Application
import androidx.room.Room
import androidx.room.withTransaction
import androidx.work.WorkManager
import com.bizflow.cloud.data.auth.AuthManager
import com.bizflow.cloud.data.local.AppDatabase
import com.bizflow.cloud.data.remote.RemoteSync
import com.bizflow.cloud.data.remote.SupabaseClientProvider
import com.bizflow.cloud.data.repository.ClientRepository
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.PdfGeneratorRepositoryImpl
import com.bizflow.cloud.data.sync.ConnectivityMonitor
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
            .addMigrations(AppDatabase.MIGRATION_4_5)
            .addMigrations(AppDatabase.MIGRATION_5_6)
            .build()
    }

    val documentRepository: DocumentRepository by lazy {
        DocumentRepository(
            documentDao = database.documentDao(),
            lineItemDao = database.lineItemDao(),
            syncQueueDao = database.syncQueueDao(),
            userIdProvider = { authManager.currentUserId() },
        )
    }

    val clientRepository: ClientRepository by lazy {
        ClientRepository(
            clientDao = database.clientDao(),
            syncQueueDao = database.syncQueueDao(),
            userIdProvider = { authManager.currentUserId() },
        )
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

    val supabaseClient: SupabaseClient? by lazy { SupabaseClientProvider.create(this) }

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
        registerSignOutCleanup()
        ConnectivityMonitor.start(this)
        applicationScope.launch { authManager.awaitReady() }
        if (WorkManager.isInitialized()) {
            SyncScheduler.schedule(this)
        }
    }

    private fun registerSignOutCleanup() {
        authManager.registerSignOutCleanup { userId ->
            applicationScope.launch {
                runCatching {
                    database.withTransaction {
                        database.documentDao().clearForUser(userId)
                        database.lineItemDao().clearForUser(userId)
                        database.clientDao().clearForUser(userId)
                        database.syncQueueDao().clearForUser(userId)
                    }
                }
            }
        }
    }
}