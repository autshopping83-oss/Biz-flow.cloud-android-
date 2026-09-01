package com.bizflow.cloud.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.repository.ClientRepository
import java.util.UUID
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ClientsViewModel(
    private val clientRepository: ClientRepository,
) : ViewModel() {

    val clients: StateFlow<List<ClientEntity>> = clientRepository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun save(
        id: String?,
        name: String,
        contact: String,
        location: String,
        identifier: String,
        onDone: () -> Unit,
    ) {
        val cleanName = name.trim()
        if (cleanName.isEmpty()) return
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val existing = id?.let { clientRepository.getById(it) }
            val client = ClientEntity(
                id = existing?.id ?: UUID.randomUUID().toString(),
                name = cleanName,
                contact = contact.trim(),
                location = location.trim(),
                nuit = identifier.trim(),
                userId = existing?.userId,
                synced = existing?.synced ?: false,
                createdAt = existing?.createdAt ?: now,
                updatedAt = now,
                deletedAt = null,
            )
            clientRepository.save(client)
            onDone()
        }
    }

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                ClientsViewModel(app.clientRepository)
            }
        }
    }
}
