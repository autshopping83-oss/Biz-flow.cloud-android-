package com.bizflow.cloud.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType

@Entity(tableName = "documents")
data class DocumentEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "type") val documentType: DocumentType,
    val number: String,
    val date: String,
    val dueDate: String?,
    val currency: String,
    val language: String,
    val clientName: String,
    val clientContact: String,
    val clientWhatsApp: String?,
    val clientLocation: String,
    val clientNuit: String,
    val companyName: String?,
    val companyAddress: String?,
    val companyNuit: String?,
    val companyContact: String?,
    val companyLogo: String?,
    val companyTradingName: String? = null,
    val companyCity: String? = null,
    val companyCountry: String? = null,
    val companyWhatsApp: String? = null,
    val companyEmail: String? = null,
    val companyWebsite: String? = null,
    val companyIdentifierType: String? = null,
    val companyIdentifierValue: String? = null,
    val subtotal: Double,
    val taxRate: Double,
    val taxAmount: Double,
    val discount: Double,
    val total: Double,
    val paymentMethod: String?,
    val stampText: String?,
    val signatureData: String?,
    val signaturePath: String? = null,
    @ColumnInfo(name = "status") val status: DocumentStatus = DocumentStatus.PENDENTE,
    val documentTheme: String?,
    val createdAt: Long,
    val pdfUrl: String?,
    val synced: Boolean,
    val updatedAt: Long,
    val deletedAt: Long?,
)