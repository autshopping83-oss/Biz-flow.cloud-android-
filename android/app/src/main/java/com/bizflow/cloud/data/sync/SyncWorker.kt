package com.bizflow.cloud.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.bizflow.cloud.BizFlowApplication
import kotlinx.coroutines.CancellationException

/**
 * Worker unico do sync. No-op quando o Supabase nao esta configurado ou nao
 * existe sessao; Result.retry() em falha transiente para o WorkManager
 * reaplicar backoff. Falhas de negocio ficam no outbox (sync_queue).
 */
class SyncWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext as BizFlowApplication
        val auth = app.authManager
        if (!auth.isConfigured) return Result.success()
        auth.awaitReady()
        if (auth.currentUserId() == null) return Result.success()

        val repository = app.syncRepository ?: return Result.success()
        return try {
            repository.syncNow()
            Result.success()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.retry()
        }
    }
}