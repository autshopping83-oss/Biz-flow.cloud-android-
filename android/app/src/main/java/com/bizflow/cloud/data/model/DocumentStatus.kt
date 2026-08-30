package com.bizflow.cloud.data.model

enum class DocumentStatus {
    PAGO,
    EMITIDO,
    PENDENTE,
    ANULADO;

    companion object {
        fun fromStorage(value: String?): DocumentStatus = when (value) {
            "PAID" -> PAGO
            "SENT" -> EMITIDO
            "OVERDUE" -> ANULADO
            "DRAFT" -> PENDENTE
            else -> values().firstOrNull { it.name == value } ?: PENDENTE
        }
    }
}