package com.bizflow.cloud.data.security

import android.content.Context
import java.util.UUID

/**
 * Identificador de instalacao/device (UUID aleatorio unico por instalacao).
 * Nao e' um dado sensivel (nao e' IMEI/Android ID nem token de auth), por isso
 * e' persistido em SharedPreferences comum. Serve para: correlacionar o device
 * com o user_id na base e permitir idempotencia no fluxo multi-device.
 */
object DeviceIdProvider {

    private const val PREFS = "bizflow_device"
    private const val KEY_DEVICE_ID = "device_id"

    fun get(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.getString(KEY_DEVICE_ID, null)?.let { return it }
        val id = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        return id
    }
}
