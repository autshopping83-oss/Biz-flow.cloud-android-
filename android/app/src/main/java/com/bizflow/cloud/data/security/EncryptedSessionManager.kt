package com.bizflow.cloud.data.security

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import io.github.jan.supabase.gotrue.SessionManager
import io.github.jan.supabase.gotrue.user.UserSession
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.serialization.json.Json

/**
 * Persiste a sessao GoTrue de forma segura. Em Android 6+ (API 23) os tokens
 * sao cifrados com AES-GCM cuja chave vive no Android Keystore; apenas o bloco
 * cifrado (base64) fica em SharedPreferences — nunca tokens em texto simples.
 * Em API < 23 a persistencia e desativada (sessao apenas em memoria) para nunca
 * degradar para texto plano, preservando o comportamento offline atual.
 */
class EncryptedSessionManager(
    context: Context,
    private val prefs: SharedPreferences,
) : SessionManager {

    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun saveSession(session: UserSession) {
        if (Build.VERSION.SDK_INT < 23) return
        runCatching {
            val bytes = json.encodeToString(UserSession.serializer(), session).toByteArray()
            prefs.edit().putString(KEY_SESSION, Base64.encodeToString(encrypt(bytes), Base64.NO_WRAP)).apply()
        }
    }

    override suspend fun loadSession(): UserSession? {
        if (Build.VERSION.SDK_INT < 23) return null
        val cipherText = prefs.getString(KEY_SESSION, null) ?: return null
        return runCatching {
            val plain = decrypt(Base64.decode(cipherText, Base64.NO_WRAP))
            json.decodeFromString(UserSession.serializer(), String(plain))
        }.getOrNull()
    }

    override suspend fun deleteSession() {
        prefs.edit().remove(KEY_SESSION).apply()
    }

    private fun encrypt(plain: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val iv = cipher.iv
        val output = cipher.doFinal(plain)
        return iv + output
    }

    private fun decrypt(payload: ByteArray): ByteArray {
        val iv = payload.copyOfRange(0, IV_SIZE)
        val body = payload.copyOfRange(IV_SIZE, payload.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_LENGTH_BITS, iv))
        return cipher.doFinal(body)
    }

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return generator.generateKey()
    }

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "bizflow_session_key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val TAG_LENGTH_BITS = 128
        const val IV_SIZE = 12
        const val KEY_SESSION = "encrypted_session"
    }
}
