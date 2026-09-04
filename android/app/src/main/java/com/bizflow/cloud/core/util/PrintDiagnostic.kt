package com.bizflow.cloud.core.util

import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object PrintDiagnostic {
    private const val TAG = "PDF_PRINT"
    private val events = mutableListOf<String>()
    private val sdf = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
    @Volatile var lastReachedStep: String = "NONE"
        private set

    fun record(step: String) {
        val ts = sdf.format(Date())
        val line = "[$ts] $step"
        events.add(line)
        lastReachedStep = step
        Log.d(TAG, line)
    }

    fun recordError(step: String, t: Throwable) {
        val ts = sdf.format(Date())
        val line = "[$ts] $step CLASS=${t::class.java.name} MSG=${t.message}"
        events.add(line)
        lastReachedStep = step
        Log.e(TAG, line, t)
    }

    fun recordContextInfo(contextClass: String, isActivity: Boolean, pkg: String) {
        record("PRINT_CONTEXT_CLASS=$contextClass")
        record("PRINT_CONTEXT_IS_ACTIVITY=$isActivity")
        record("PRINT_CONTEXT_PACKAGE=$pkg")
    }

    fun getLog(): String = events.joinToString("\n")

    fun clear() {
        events.clear()
        lastReachedStep = "NONE"
    }
}
