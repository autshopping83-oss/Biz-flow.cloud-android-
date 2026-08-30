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
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

class HomeViewModel(
    private val repository: DocumentRepository,
) : ViewModel() {

    val recentDocuments: StateFlow<List<DocumentWithItems>> = repository.observeAll()
        .map { docs -> docs.take(MAX_RECENT) }
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

    companion object {
        private const val MAX_RECENT = 5

        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                HomeViewModel(app.documentRepository)
            }
        }
    }
}