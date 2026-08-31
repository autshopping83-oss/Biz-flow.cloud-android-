package com.bizflow.cloud.data.auth

import io.github.jan.supabase.gotrue.SessionStatus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthManagerTest {

    private val localOnly = AuthManager(null)

    @Test
    fun `local only build is not configured and has no session`() {
        assertFalse(localOnly.isConfigured)
        assertNull(localOnly.currentUserId())
        assertTrue(localOnly.sessionStatus.value is SessionStatus.NotAuthenticated)
    }

    @Test
    fun `local only signIn fails with not configured`() = runBlocking {
        val result = localOnly.signIn("a@b.c", "secret")
        assertTrue(result.isFailure)
        assertEquals(AuthManager.NotConfiguredException, result.exceptionOrNull())
    }

    @Test
    fun `local only signUp fails with not configured`() = runBlocking {
        val result = localOnly.signUp("a@b.c", "secret")
        assertTrue(result.isFailure)
        assertEquals(AuthManager.NotConfiguredException, result.exceptionOrNull())
    }

    @Test
    fun `local only google sign-in fails with not configured`() = runBlocking {
        val result = localOnly.signInWithGoogle()
        assertTrue(result.isFailure)
        assertEquals(AuthManager.NotConfiguredException, result.exceptionOrNull())
    }

    @Test
    fun `local only password reset fails with not configured`() = runBlocking {
        val result = localOnly.resetPasswordForEmail("a@b.c")
        assertTrue(result.isFailure)
        assertEquals(AuthManager.NotConfiguredException, result.exceptionOrNull())
    }
}
