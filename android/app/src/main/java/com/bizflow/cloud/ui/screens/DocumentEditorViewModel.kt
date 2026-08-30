package com.bizflow.cloud.ui.screens

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.model.DocumentType
import com.bizflow.cloud.data.repository.DocumentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

data class EditorItemUi(
    val id: String,
    val description: String,
    val quantity: String,
    val unitPrice: String,
)

data class DocumentEditorUiState(
    val type: String = DocumentType.INVOICE,
    val clientName: String = "",
    val clientContact: String = "",
    val clientLocation: String = "",
    val clientNuit: String = "",
    val date: String = "",
    val discount: String = "",
    val items: List<EditorItemUi> = emptyList(),
    val isSaving: Boolean = false,
)

class DocumentEditorViewModel(
    private val repository: DocumentRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val type: String =
        savedStateHandle.get<String>("documentType") ?: DocumentType.INVOICE

    private val _uiState = MutableStateFlow(
        DocumentEditorUiState(type = type, date = todayIso()),
    )
    val uiState: StateFlow<DocumentEditorUiState> = _uiState.asStateFlow()

    private val documentId = UUID.randomUUID().toString()

    fun updateClientName(value: String) { _uiState.value = _uiState.value.copy(clientName = value) }

    fun updateClientContact(value: String) { _uiState.value = _uiState.value.copy(clientContact = value) }

    fun updateClientLocation(value: String) { _uiState.value = _uiState.value.copy(clientLocation = value) }

    fun updateClientNuit(value: String) { _uiState.value = _uiState.value.copy(clientNuit = value) }

    fun updateDate(isoDate: String) { _uiState.value = _uiState.value.copy(date = isoDate) }

    fun updateDiscount(value: String) { _uiState.value = _uiState.value.copy(discount = value) }

    fun addItem(description: String, quantity: String, unitPrice: String) {
        val item = EditorItemUi(
            id = UUID.randomUUID().toString(),
            description = description.trim(),
            quantity = quantity,
            unitPrice = unitPrice,
        )
        _uiState.value = _uiState.value.copy(items = _uiState.value.items + item)
    }

    fun updateItem(id: String, description: String, quantity: String, unitPrice: String) {
        val items = _uiState.value.items.map {
            if (it.id == id) {
                it.copy(
                    description = description.trim(),
                    quantity = quantity,
                    unitPrice = unitPrice,
                )
            } else {
                it
            }
        }
        _uiState.value = _uiState.value.copy(items = items)
    }

    fun removeItem(id: String) {
        _uiState.value = _uiState.value.copy(items = _uiState.value.items.filterNot { it.id == id })
    }

    fun save(onSaved: () -> Unit) {
        val state = _uiState.value
        if (state.isSaving) return
        _uiState.value = state.copy(isSaving = true)
        viewModelScope.launch {
            val items = buildItems(state)
            val number = repository.nextNumber(type)
            val document = buildDocument(state, items, number)
            repository.save(document, items)
            onSaved()
        }
    }

    private fun buildItems(state: DocumentEditorUiState): List<LineItemEntity> {
        return state.items
            .filter { it.description.isNotBlank() }
            .map { item ->
                val quantity = item.quantity.toDoubleOrNull() ?: 0.0
                val unitPrice = item.unitPrice.toDoubleOrNull() ?: 0.0
                LineItemEntity(
                    id = item.id,
                    documentId = documentId,
                    description = item.description,
                    quantity = quantity,
                    unitPrice = unitPrice,
                    total = quantity * unitPrice,
                )
            }
    }

    private fun buildDocument(
        state: DocumentEditorUiState,
        items: List<LineItemEntity>,
        number: String,
    ): DocumentEntity {
        val now = System.currentTimeMillis()
        val subtotal = items.sumOf { it.total }
        val taxRate = TAX_RATE
        val taxAmount = subtotal * taxRate
        val discount = state.discount.toDoubleOrNull() ?: 0.0
        return DocumentEntity(
            id = documentId,
            type = type,
            number = number,
            date = state.date,
            dueDate = null,
            currency = CURRENCY,
            language = Locale.getDefault().language,
            clientName = state.clientName.trim(),
            clientContact = state.clientContact.trim(),
            clientWhatsApp = null,
            clientLocation = state.clientLocation.trim(),
            clientNuit = state.clientNuit.trim(),
            companyName = null,
            companyAddress = null,
            companyNuit = null,
            companyContact = null,
            companyLogo = null,
            subtotal = subtotal,
            taxRate = taxRate,
            taxAmount = taxAmount,
            discount = discount,
            total = kotlin.math.max(0.0, subtotal + taxAmount - discount),
            paymentMethod = null,
            stampText = null,
            signatureData = null,
            status = STATUS_DRAFT,
            documentTheme = null,
            createdAt = now,
            pdfUrl = null,
            synced = false,
            updatedAt = now,
            deletedAt = null,
        )
    }

    companion object {
        private const val TAX_RATE = 0.16
        private const val CURRENCY = "MZN"
        private const val STATUS_DRAFT = "DRAFT"

        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                DocumentEditorViewModel(
                    repository = app.documentRepository,
                    savedStateHandle = createSavedStateHandle(),
                )
            }
        }

        fun todayIso(): String =
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }
}