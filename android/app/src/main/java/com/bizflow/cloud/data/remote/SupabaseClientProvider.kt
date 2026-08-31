package com.bizflow.cloud.data.remote

import android.content.Context
import com.bizflow.cloud.BuildConfig
import com.bizflow.cloud.data.security.DeviceIdProvider
import com.bizflow.cloud.data.security.EncryptedSessionManager
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseClientProvider {
    /**
     * Cria o cliente Supabase (GoTrue + PostgREST) a partir do BuildConfig.
     * Instala a persistencia segura de sessao (Android Keystore) e o
     * identificador de instalacao. Retorna null quando as credenciais estao
     * ausentes (ex.: build sem secrets) — o app degrada para modo apenas-local.
     */
    fun create(context: Context): SupabaseClient? {
        val url = BuildConfig.SUPABASE_URL
        val key = BuildConfig.SUPABASE_PUBLISHABLE_KEY
        if (url.isBlank() || key.isBlank()) return null
        DeviceIdProvider.get(context)
        return createSupabaseClient(url, key) {
            install(Postgrest)
            install(Auth) {
                scheme = "bizflowcloud"
                host = "auth"
                autoLoadFromStorage = true
                autoSaveToStorage = true
                sessionManager = EncryptedSessionManager(
                    context = context.applicationContext,
                    prefs = context.getSharedPreferences("bizflow_session", Context.MODE_PRIVATE),
                )
            }
        }
    }
}
