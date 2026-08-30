package com.bizflow.cloud

import android.app.Application
import android.content.Context
import androidx.room.Room
import com.bizflow.cloud.data.local.AppDatabase
import com.bizflow.cloud.data.repository.DocumentRepository

class BizFlowApplication : Application() {
    val database: AppDatabase by lazy {
        Room.databaseBuilder(this, AppDatabase::class.java, "bizflow.db")
            .fallbackToDestructiveMigration()
            .build()
    }

    val documentRepository: DocumentRepository by lazy {
        DocumentRepository(database.documentDao(), database.lineItemDao())
    }
}

val Context.bizFlowDatabase: AppDatabase
    get() = (applicationContext as BizFlowApplication).database