package com.bizflow.cloud.data.model

object DocumentType {
    const val INVOICE = "INVOICE"
    const val INVOICE_RECEIPT = "INVOICE_RECEIPT"
    const val RECEIPT = "RECEIPT"
    const val QUOTE = "QUOTE"

    val all = listOf(INVOICE, INVOICE_RECEIPT, RECEIPT, QUOTE)

    fun prefix(type: String): String = when (type) {
        INVOICE -> "FT"
        INVOICE_RECEIPT -> "FTR"
        RECEIPT -> "REC"
        else -> "COT"
    }
}