package com.bizflow.cloud.data.model

enum class DocumentType(val code: String) {
    FATURA("INVOICE"),
    FATURA_RECIBO("INVOICE_RECEIPT"),
    RECIBO("RECEIPT"),
    ORCAMENTO("QUOTE");

    val prefix: String
        get() = when (this) {
            FATURA -> "FT"
            FATURA_RECIBO -> "FTR"
            RECIBO -> "REC"
            ORCAMENTO -> "COT"
        }

    companion object {
        fun fromCode(code: String?): DocumentType = values().firstOrNull { it.code == code } ?: FATURA
    }
}