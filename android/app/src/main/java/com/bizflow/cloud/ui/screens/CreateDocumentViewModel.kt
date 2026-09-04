package com.bizflow.cloud.ui.screens

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.R
import com.bizflow.cloud.core.util.ImageFiles
import com.bizflow.cloud.core.util.LocaleHelper
import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import com.bizflow.cloud.data.local.entity.DocumentEntity
import com.bizflow.cloud.data.local.entity.LineItemEntity
import com.bizflow.cloud.data.local.entity.ProductEntity
import com.bizflow.cloud.data.local.entity.TransactionEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType
import com.bizflow.cloud.data.repository.ClientRepository
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import com.bizflow.cloud.data.repository.DocumentRepository
import com.bizflow.cloud.data.repository.ProductRepository
import com.bizflow.cloud.data.repository.TransactionRepository
import com.bizflow.cloud.data.repository.PdfGeneratorRepositoryImpl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
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
    val taxRate: Double = 0.0,
)
class CreateDocumentViewModel(
    private val documentRepository: DocumentRepository,
    private val clientRepository: ClientRepository,
    private val productRepository: ProductRepository,
    private val pdfGenerator: PdfGeneratorRepositoryImpl,
    private val companySettingsRepository: CompanySettingsRepository,
    private val transactionRepository: TransactionRepository,
    private val appContext: Context,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val initialType: DocumentType = DocumentType.fromCode(savedStateHandle.get<String>("documentType"))
    private val existingDocumentId: String? = savedStateHandle.get<String>("documentId")
    private val _uiState = MutableStateFlow(CreateDocumentUiState(type = initialType, date = todayIso()))
    val uiState: StateFlow<CreateDocumentUiState> = _uiState.asStateFlow()
    val clients: StateFlow<List<ClientEntity>> = clientRepository
        .observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val products: StateFlow<List<ProductEntity>> = productRepository
        .observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            val settings = companySettingsRepository.getSettings()
            if (_uiState.value.currency.isBlank() && settings?.currency != null) {
                _uiState.value = _uiState.value.copy(currency = settings.currency)
            }
            if (settings?.defaultTaxRate != null) {
                _uiState.value = _uiState.value.copy(taxRate = settings.defaultTaxRate)
            }
            companySnapshot = settings
            if (existingDocumentId != null) {
                loadExistingDocument(existingDocumentId)
            }
        }
    }

    private suspend fun loadExistingDocument(docId: String) {
        val docWithItems = documentRepository.observeById(docId)
            .firstOrNull()
        if (docWithItems == null) return
        val doc = docWithItems.document
        existingDocumentNumber = doc.number
        val items = docWithItems.items.map { line ->
            EditorItemUi(
                id = line.id,
                description = line.description,
                quantity = if (line.quantity == line.quantity.toLong().toDouble()) line.quantity.toLong().toString() else line.quantity.toString(),
                unitPrice = if (line.unitPrice == line.unitPrice.toLong().toDouble()) line.unitPrice.toLong().toString() else line.unitPrice.toString(),
            )
        }
        _uiState.value = _uiState.value.copy(
            type = doc.documentType,
            clientName = doc.clientName,
            clientContact = doc.clientContact,
            clientLocation = doc.clientLocation,
            clientNuit = doc.clientNuit,
            date = doc.date,
            discount = if (doc.discount == 0.0) "" else doc.discount.toString(),
            status = doc.status,
            paymentMethod = doc.paymentMethod,
            currency = doc.currency,
            items = items,
            signaturePath = doc.signaturePath,
        )
    }

    private var companySnapshot: CompanySettingsEntity? = null
    private val documentId = existingDocumentId ?: UUID.randomUUID().toString()
    private var existingDocumentNumber: String? = null
    private var previewNumber: String = ""

    fun updateType(type: DocumentType) { _uiState.value = _uiState.value.copy(type = type) }

    fun selectClient(client: ClientEntity) {
        _uiState.value = _uiState.value.copy(
            clientName = client.name, clientContact = client.contact.orEmpty(),
            clientLocation = client.location.orEmpty(), clientNuit = client.nuit.orEmpty(),
        )
    }

    fun saveClient(name: String, contact: String, location: String, nuit: String) {
        val cleanName = name.trim()
        if (cleanName.isEmpty()) return
        val client = ClientEntity(
            id = UUID.randomUUID().toString(),
            name = cleanName,
            contact = contact.trim(),
            location = location.trim(),
            nuit = nuit.trim(),
            userId = null,
            synced = false,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            deletedAt = null,
        )
        viewModelScope.launch {
            clientRepository.save(client)
            selectClient(client)
        }
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
        val item = EditorItemUi(UUID.randomUUID().toString(), description.trim(), quantity, unitPrice)
        _uiState.value = _uiState.value.copy(items = _uiState.value.items + item)
    }

    fun updateItem(id: String, description: String, quantity: String, unitPrice: String) {
        _uiState.value = _uiState.value.copy(
            items = _uiState.value.items.map {
                if (it.id == id) it.copy(description = description.trim(), quantity = quantity, unitPrice = unitPrice) else it
            },
        )
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

    fun clearSignature() { _uiState.value = _uiState.value.copy(signaturePath = null) }

    fun save(onSaved: () -> Unit) {
        val state = _uiState.value
        if (state.isSaving) return
        _uiState.value = state.copy(isSaving = true)
        viewModelScope.launch {
            val items = buildItems(state)
            val number = existingDocumentNumber ?: documentRepository.nextNumber(state.type)
            val document = buildDocument(state, items, number)
            documentRepository.save(document, items)
            if (document.status == DocumentStatus.PAGO) {
                createFinanceFromDocument(document)
            }
            onSaved()
        }
    }

    private suspend fun createFinanceFromDocument(document: DocumentEntity) {
        val existing = transactionRepository.getByDocumentId(document.id)
        if (existing != null) return
        val timestamp = try {
            SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(document.date)?.time
        } catch (_: Exception) { System.currentTimeMillis() }
        transactionRepository.save(
            TransactionEntity(
                id = UUID.randomUUID().toString(),
                userId = null,
                type = FinanceViewModel.TYPE_INCOME,
                amount = document.total,
                description = "Documento ${document.number} — ${document.clientName.ifBlank { "Sem cliente" }}",
                category = FinanceViewModel.CATEGORY_DOCUMENT,
                date = document.date,
                timestamp = timestamp ?: System.currentTimeMillis(),
                receiptId = null,
                documentId = document.id,
                currency = document.currency,
                synced = false,
                updatedAt = System.currentTimeMillis(),
                deletedAt = null,
            ),
        )
    }

    fun requestPreview() {
        val state = _uiState.value
        if (state.isGeneratingPreview) return
        _uiState.value = state.copy(isGeneratingPreview = true)
        viewModelScope.launch {
            val items = buildItems(state)
            previewNumber = documentRepository.nextNumber(state.type)
            val document = buildDocument(state, items, previewNumber)
            val localeTag = LocaleHelper.getCurrentLanguageTag(appContext)
            val html = pdfGenerator.buildHtml(document, items, localeTag)
            _uiState.value = state.copy(previewHtml = html, isGeneratingPreview = false)
        }
    }

    // ── 1. Save: PDF → Documents/Biz-flow.cloud/ ───────────────────────

    fun savePdfToDisk(onResult: (Boolean, String) -> Unit) {
        val state = _uiState.value
        val html = state.previewHtml ?: return
        viewModelScope.launch {
            val number = previewNumber.ifBlank {
                documentRepository.nextNumber(state.type)
            }
            val fileName = "Fatura-BF-$number"
            val uri = pdfGenerator.savePdfToDocuments(appContext, html, fileName)
            withContext(Dispatchers.Main) {
                if (uri != null) {
                    onResult(true, appContext.getString(R.string.pdf_saved_ok, "Documents/$FOLDER_NAME/$fileName.pdf"))
                } else {
                    onResult(false, appContext.getString(R.string.pdf_save_error))
                }
            }
        }
    }

    // ── 2. Share: PDF → Android Sharesheet ─────────────────────────────

    fun sharePdf(onResult: (Boolean) -> Unit) {
        val state = _uiState.value
        val html = state.previewHtml ?: return
        viewModelScope.launch {
            val number = previewNumber.ifBlank {
                documentRepository.nextNumber(state.type)
            }
            val fileName = "Fatura-BF-$number"
            val uri = pdfGenerator.sharePdfViaFileProvider(appContext, html, fileName)
            withContext(Dispatchers.Main) {
                if (uri != null) {
                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                        type = PDF_MIME
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    appContext.startActivity(
                        Intent.createChooser(sendIntent, fileName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    )
                    onResult(true)
                } else {
                    onResult(false)
                }
            }
        }
    }

    // ── 3. Save + Print: PDF → Documents + PrintManager ────────────────

    fun saveAndPrintPdf(onResult: (Boolean, String) -> Unit) {
        val state = _uiState.value
        val html = state.previewHtml ?: return
        viewModelScope.launch {
            val number = previewNumber.ifBlank {
                documentRepository.nextNumber(state.type)
            }
            val fileName = "Fatura-BF-$number"
            val jobName = "Documento_$number"
            val uri = pdfGenerator.saveAndPrintPdf(appContext, html, fileName, jobName)
            withContext(Dispatchers.Main) {
                if (uri != null) {
                    onResult(true, appContext.getString(R.string.pdf_saved_ok, "Documents/$FOLDER_NAME/$fileName.pdf"))
                } else {
                    onResult(false, appContext.getString(R.string.pdf_save_error))
                }
            }
        }
    }

    fun resetPreview() { _uiState.value = _uiState.value.copy(previewHtml = null) }

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
        val taxAmount = subtotal * state.taxRate
        val discount = state.discount.toDoubleOrNull() ?: 0.0
        return DocumentEntity(
            id = documentId,
            documentType = state.type,
            number = number,
            date = state.date,
            dueDate = null,
            currency = state.currency,
            language = Locale.getDefault().language,
            clientName = state.clientName.trim(),
            clientContact = state.clientContact.trim(),
            clientWhatsApp = null,
            clientLocation = state.clientLocation.trim(),
            clientNuit = state.clientNuit.trim(),
            companyName = companySnapshot?.name?.takeIf { it.isNotBlank() },
            companyAddress = companySnapshot?.address?.takeIf { it.isNotBlank() },
            companyNuit = companySnapshot?.companyIdentifierValue?.takeIf { it.isNotBlank() } ?: companySnapshot?.nuit?.takeIf { it.isNotBlank() },
            companyContact = companySnapshot?.contact?.takeIf { it.isNotBlank() },
            companyLogo = companySnapshot?.logoPath?.takeIf { it.isNotBlank() } ?: companySnapshot?.logo?.takeIf { it.isNotBlank() },
            companyTradingName = companySnapshot?.tradingName?.takeIf { it.isNotBlank() },
            companyCity = companySnapshot?.city?.takeIf { it.isNotBlank() },
            companyCountry = companySnapshot?.country?.takeIf { it.isNotBlank() },
            companyWhatsApp = companySnapshot?.whatsApp?.takeIf { it.isNotBlank() },
            companyEmail = companySnapshot?.email?.takeIf { it.isNotBlank() },
            companyWebsite = companySnapshot?.website?.takeIf { it.isNotBlank() },
            companyIdentifierType = companySnapshot?.companyIdentifierType?.takeIf { it.isNotBlank() },
            companyIdentifierValue = companySnapshot?.companyIdentifierValue?.takeIf { it.isNotBlank() } ?: companySnapshot?.nuit?.takeIf { it.isNotBlank() },
            subtotal = subtotal,
            taxRate = state.taxRate,
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
        private const val PDF_MIME = "application/pdf"
        private const val FOLDER_NAME = "Biz-flow.cloud"

        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                CreateDocumentViewModel(
                    documentRepository = app.documentRepository,
                    clientRepository = app.clientRepository,
                    productRepository = app.productRepository,
                    pdfGenerator = app.pdfGeneratorRepository,
                    companySettingsRepository = app.companySettingsRepository,
                    transactionRepository = app.transactionRepository,
                    appContext = app.applicationContext,
                    savedStateHandle = createSavedStateHandle(),
                )
            }
        }

        fun todayIso(): String =
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }
}
