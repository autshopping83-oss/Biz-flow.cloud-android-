package com.bizflow.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "documents")
data class DocumentEntity(
    @PrimaryKey val id: String,
    val type: String,
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
    val subtotal: Double,
    val taxRate: Double,
    val taxAmount: Double,
    val discount: Double,
    val total: Double,
    val paymentMethod: String?,
    val stampText: String?,
    val signatureData: String?,
    val status: String?,
    val documentTheme: String?,
    val createdAt: Long,
    val pdfUrl: String?,
    val synced: Boolean,
    val updatedAt: Long,
    val deletedAt: Long?,
)