package com.bizflow.cloud.data.remote

import com.bizflow.cloud.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseClientProvider {
    /**
     * Cria o cliente Supabase (GoTrue + PostgREST) a partir do BuildConfig.
     * Retorna null quando SUPABASE_URL/SUPABASE_ANON_KEY nao estao preenchidas
     * (ex.: build sem secrets) — o app degrada para modo apenas-local.
     */
    fun create(): SupabaseClient? {
        val url = BuildConfig.SUPABASE_URL
        val key = BuildConfig.SUPABASE_ANON_KEY
        if (url.isBlank() || key.isBlank()) return null
        return createSupabaseClient(url, key) {
            install(Postgrest)
            install(GoTrue)
        }
    }
}