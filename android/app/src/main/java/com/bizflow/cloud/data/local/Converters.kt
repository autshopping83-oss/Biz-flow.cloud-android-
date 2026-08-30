package com.bizflow.cloud.data.local

import androidx.room.TypeConverter
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType

class Converters {
    @TypeConverter
    fun documentTypeToString(type: DocumentType): String = type.code

    @TypeConverter
    fun stringToDocumentType(value: String?): DocumentType = DocumentType.fromCode(value)

    @TypeConverter
    fun documentStatusToString(status: DocumentStatus): String = status.name

    @TypeConverter
    fun stringToDocumentStatus(value: String?): DocumentStatus = DocumentStatus.fromStorage(value)
}