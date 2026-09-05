package com.bizflow.cloud.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.local.model.DocumentWithItems
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.TransactionRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class DocumentsViewModel(
    private val repository: DocumentRepository,
    private val transactionRepository: TransactionRepository,
) : ViewModel() {

    val documents: StateFlow<List<DocumentWithItems>> = repository.observeAll()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    val pendingSyncCount: StateFlow<Int> = repository.observePendingSyncCount()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = 0,
        )

    fun delete(id: String) {
        viewModelScope.launch {
            transactionRepository.softDeleteByDocumentId(id)
            repository.softDelete(id)
        }
    }

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                DocumentsViewModel(
                    app.documentRepository,
                    app.transactionRepository,
                )
            }
        }
    }
}