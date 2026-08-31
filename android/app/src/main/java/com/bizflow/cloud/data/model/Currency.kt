package com.bizflow.cloud.data.model

/**
 * Moeda da empresa (ISO 4217). O codigo ISO e o identificador estavel; o nome,
 * simbolo e casas decimais sao propriedades de apresentacao. A moeda e' apenas
 * a BASE da empresa (nao e' cambio: sem conversao ou taxas).
 */
data class Currency(
    val code: String,
    val name: String,
    val symbol: String,
    val decimalDigits: Int,
)
