package com.bizflow.cloud.core.util

import com.bizflow.cloud.data.model.CurrencyCatalog
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs

fun formatMoney(amount: Double, currency: String, locale: Locale = Locale("pt")): String {
    val currencyObj = CurrencyCatalog.byCode(currency)
    val decimalDigits = currencyObj?.decimalDigits ?: 2

    val symbols = DecimalFormatSymbols(locale)
    val pattern = if (decimalDigits == 0) "#,##0" else "#,##0.${"0".repeat(decimalDigits)}"
    val df = DecimalFormat(pattern, symbols)
    val formatted = df.format(abs(amount))
    val groupingSep = symbols.groupingSeparator
    val decimalSep = symbols.decimalSeparator
    val result = formatted
        .replace(groupingSep, ' ')
        .replace(decimalSep, ',')
    val sign = if (amount < 0) "-" else ""
    return "$sign$result $currency"
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
