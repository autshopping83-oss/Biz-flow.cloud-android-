package com.bizflow.cloud.core.util

import java.text.DecimalFormat
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

fun formatMoney(amount: Double, currency: String, locale: Locale = Locale.US): String {
    val nf = NumberFormat.getNumberInstance(locale)
    nf.minimumFractionDigits = 2
    nf.maximumFractionDigits = 2
    val absAmount = kotlin.math.abs(amount)
    val integer = nf.format(kotlin.math.floor(absAmount).toLong())
    val frac = String.format(locale, "%.2f", absAmount % 1).substring(1)
    val sign = if (amount < 0) "-" else ""
    val decimalSep = (nf as? DecimalFormat)?.decimalFormatSymbols?.decimalSeparator ?: '.'
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
