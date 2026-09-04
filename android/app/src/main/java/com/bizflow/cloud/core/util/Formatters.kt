package com.bizflow.cloud.core.util

import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

fun formatMoney(amount: Double, currency: String, locale: Locale = Locale.US): String {
    val nf = java.text.NumberFormat.getNumberInstance(locale)
    nf.minimumFractionDigits = 2
    nf.maximumFractionDigits = 2
    val integer = nf.format kotlin.math.floor(kotlin.math.abs(amount)).toLong()
    val frac = String.format(locale, "%.2f", kotlin.math.abs(amount) % 1).substring(1)
    val sign = if (amount < 0) "-" else ""
    val decimalSep = nf.decimalFormatSymbols.decimalSeparator
    return "$sign$integer$decimalSep$frac $currency"
}

fun formatDate(date: String, locale: Locale = Locale.US): String {
    return try {
        val parsed = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .parse(date)
        if (parsed == null) {
            date
        } else {
            val fmt = when (locale.language) {
                "zh" -> "yyyy-MM-dd"
                "en" -> "MM/dd/yyyy"
                else -> "dd/MM/yyyy"
            }
            SimpleDateFormat(fmt, locale)
                .apply { timeZone = TimeZone.getTimeZone("UTC") }
                .format(parsed)
        }
    } catch (_: Exception) {
        date
    }
}
