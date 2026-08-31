package com.bizflow.cloud.ui.screens

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.core.util.ImageFiles
import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import com.bizflow.cloud.data.repository.ClientRepository
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.PdfGeneratorRepositoryImpl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
data class CreateDocumentUiState(
    val type: DocumentType = DocumentType.FATURA,
    val clientName: String = "",
    val clientContact: String = "",
    val clientLocation: String = "",
    val clientNuit: String = "",
    val date: String = "",
    val discount: String = "",
    val status: DocumentStatus = DocumentStatus.PENDENTE,
    val paymentMethod: String? = null,
    val items: List<EditorItemUi> = emptyList(),
    val signaturePath: String? = null,
    val previewHtml: String? = null,
    val isSaving: Boolean = false,
    val isGeneratingPreview: Boolean = false,
    val currency: String = "",
)
class CreateDocumentViewModel(
    private val documentRepository: DocumentRepository,
    private val clientRepository: ClientRepository,
    private val pdfGenerator: PdfGeneratorRepositoryImpl,
    private val companySettingsRepository: CompanySettingsRepository,
    private val appContext: Context,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val initialType: DocumentType = DocumentType.fromCode(savedStateHandle.get<String>("documentType"))
    private val _uiState = MutableStateFlow(CreateDocumentUiState(type = initialType, date = todayIso()))
    val uiState: StateFlow<CreateDocumentUiState> = _uiState.asStateFlow()
    val clients: StateFlow<List<ClientEntity>> = clientRepository
        .observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            val currency = companySettingsRepository.getCurrency()
            if (_uiState.value.currency.isBlank()) _uiState.value = _uiState.value.copy(currency = currency)
        }
    }

    private val documentId = UUID.randomUUID().toString()
    private var previewNumber: String = ""

    fun updateType(type: DocumentType) { _uiState.value = _uiState.value.copy(type = type) }

    fun selectClient(client: ClientEntity) {
        _uiState.value = _uiState.value.copy(
            clientName = client.name, clientContact = client.contact.orEmpty(),
            clientLocation = client.location.orEmpty(), clientNuit = client.nuit.orEmpty(),
        )
    }

    fun updateClientName(value: String) { _uiState.value = _uiState.value.copy(clientName = value) }
    fun updateClientContact(value: String) { _uiState.value = _uiState.value.copy(clientContact = value) }
    fun updateClientLocation(value: String) { _uiState.value = _uiState.value.copy(clientLocation = value) }
    fun updateClientNuit(value: String) { _uiState.value = _uiState.value.copy(clientNuit = value) }
    fun updateDate(isoDate: String) { _uiState.value = _uiState.value.copy(date = isoDate) }
    fun updateDiscount(value: String) { _uiState.value = _uiState.value.copy(discount = value) }
    fun updateStatus(status: DocumentStatus) { _uiState.value = _uiState.value.copy(status = status) }
    fun updatePaymentMethod(method: String?) { _uiState.value = _uiState.value.copy(paymentMethod = method) }

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
                it.copy(description = description.trim(), quantity = quantity, unitPrice = unitPrice)
            } else {
                it
            }
        }
        _uiState.value = _uiState.value.copy(items = items)
    }

    fun removeItem(id: String) {
        _uiState.value = _uiState.value.copy(items = _uiState.value.items.filterNot { it.id == id })
    }

    fun saveSignature(bytes: ByteArray) {
        viewModelScope.launch {
            val path = withContext(Dispatchers.IO) { ImageFiles.saveSignaturePng(appContext, documentId, bytes) }
            _uiState.value = _uiState.value.copy(signaturePath = path)
        }
    }

    fun clearSignature() {
        _uiState.value = _uiState.value.copy(signaturePath = null)
    }

    fun save(onSaved: () -> Unit) {
        val state = _uiState.value
        if (state.isSaving) return
        _uiState.value = state.copy(isSaving = true)
        viewModelScope.launch {
            val items = buildItems(state)
            val number = documentRepository.nextNumber(state.type)
            val document = buildDocument(state, items, number)
            documentRepository.save(document, items)
            onSaved()
        }
    }

    fun requestPreview() {
        val state = _uiState.value
        if (state.isGeneratingPreview) return
        _uiState.value = state.copy(isGeneratingPreview = true)
        viewModelScope.launch {
            val items = buildItems(state)
            previewNumber = documentRepository.nextNumber(state.type)
            val document = buildDocument(state, items, previewNumber)
            val html = pdfGenerator.buildHtml(document, items)
            _uiState.value = state.copy(previewHtml = html, isGeneratingPreview = false)
        }
    }

    fun printPreview() {
        val html = _uiState.value.previewHtml ?: return
        pdfGenerator.printHtml(appContext, html, "Documento_$previewNumber")
    }

    fun resetPreview() {
        _uiState.value = _uiState.value.copy(previewHtml = null)
    }

    private fun buildItems(state: CreateDocumentUiState): List<LineItemEntity> =
        state.items
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

    private fun buildDocument(
        state: CreateDocumentUiState,
        items: List<LineItemEntity>,
        number: String,
    ): DocumentEntity {
        val now = System.currentTimeMillis()
        val subtotal = items.sumOf { it.total }
        val taxAmount = subtotal * TAX_RATE
        val discount = state.discount.toDoubleOrNull() ?: 0.0
        return DocumentEntity(
            id = documentId,
            documentType = state.type,
            number = number,
            date = state.date,
            dueDate = null,
            currency = state.currency.ifBlank { CURRENCY },
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
            taxRate = TAX_RATE,
            taxAmount = taxAmount,
            discount = discount,
            total = kotlin.math.max(0.0, subtotal + taxAmount - discount),
            paymentMethod = state.paymentMethod,
            stampText = null,
            signatureData = null,
            signaturePath = state.signaturePath,
            status = state.status,
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

        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                CreateDocumentViewModel(
                    documentRepository = app.documentRepository,
                    clientRepository = app.clientRepository,
                    pdfGenerator = app.pdfGeneratorRepository,
                    companySettingsRepository = app.companySettingsRepository,
                    appContext = app.applicationContext,
                    savedStateHandle = createSavedStateHandle(),
                )
            }
        }

        fun todayIso(): String =
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }
}
