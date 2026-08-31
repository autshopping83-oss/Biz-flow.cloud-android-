package com.bizflow.cloud.data.auth

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.SessionStatus
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.builtin.Email
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Estado de autenticacao (GoTrue). Expose o sessionStatus como Flow e os
 * comandos de signIn/signUp/signOut. Com [isConfigured] false o app fica
 * apenas-local: nenhuma sessao, operacoes de auth retornam falha controlada.
 */
class AuthManager(private val supabase: SupabaseClient?) {

    private val offlineStatus = MutableStateFlow<SessionStatus>(SessionStatus.NotAuthenticated(true))

    val isConfigured: Boolean get() = supabase != null

    val sessionStatus: StateFlow<SessionStatus> = supabase?.auth?.sessionStatus ?: offlineStatus

    fun currentUserId(): String? = supabase?.auth?.currentSessionOrNull()?.user?.id

    suspend fun awaitReady() {
        supabase?.auth?.awaitInitialization()
    }

    suspend fun signIn(email: String, password: String): Result<Unit> {
        val client = supabase ?: return Result.failure(NotConfiguredException)
        return attempt {
            client.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
        }
    }

    suspend fun signUp(email: String, password: String): Result<Unit> {
        val client = supabase ?: return Result.failure(NotConfiguredException)
        return attempt {
            client.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            if (client.auth.currentSessionOrNull() == null) {
                client.auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
            }
        }
    }

    suspend fun signOut() {
        supabase?.auth?.signOut()
    }

    suspend fun signInWithGoogle(): Result<Unit> {
        val client = supabase ?: return Result.failure(NotConfiguredException)
        return attempt {
            client.auth.signInWith(Google)
        }
    }

    suspend fun resetPasswordForEmail(email: String): Result<Unit> {
        val client = supabase ?: return Result.failure(NotConfiguredException)
        return attempt {
            client.auth.resetPasswordForEmail(email)
        }
    }

    private suspend fun attempt(block: suspend () -> Unit): Result<Unit> = try {
        block()
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }

    object NotConfiguredException : Exception(
        "Supabase nao configurado (SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY ausentes no build)",
    )
}