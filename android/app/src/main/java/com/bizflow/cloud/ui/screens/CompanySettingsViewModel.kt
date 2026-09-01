package com.bizflow.cloud.ui.screens

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.core.util.ImageFiles
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import com.bizflow.cloud.data.model.CurrencyCatalog
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class CompanySettingsUiState(
    val templateId: String = CompanySettingsEntity.DEFAULT_TEMPLATE_ID,
    val logoPath: String? = null,
    val stampPath: String? = null,
    val signaturePath: String? = null,
    val currency: String = CurrencyCatalog.DEFAULT_CODE,
    val defaultTaxRate: Double = 0.0,
    val name: String = "",
    val tradingName: String = "",
    val address: String = "",
    val city: String = "",
    val country: String = "",
    val identifierType: String = "",
    val identifierValue: String = "",
    val contact: String = "",
    val whatsApp: String = "",
    val email: String = "",
    val website: String = "",
    val isSaving: Boolean = false,
)

class CompanySettingsViewModel(
    private val appContext: Context,
    private val companySettingsRepository: CompanySettingsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CompanySettingsUiState())
    val uiState: StateFlow<CompanySettingsUiState> = _uiState.asStateFlow()

    fun refresh() {
        viewModelScope.launch {
            val s = companySettingsRepository.getSettings()
            _uiState.value = CompanySettingsUiState(
                templateId = s?.documentTemplateId ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID,
                logoPath = s?.logoPath,
                stampPath = s?.stampPath,
                signaturePath = s?.defaultSignaturePath,
                currency = s?.currency ?: CurrencyCatalog.DEFAULT_CODE,
                defaultTaxRate = s?.defaultTaxRate ?: 0.0,
                name = s?.name.orEmpty(),
                tradingName = s?.tradingName.orEmpty(),
                address = s?.address.orEmpty(),
                city = s?.city.orEmpty(),
                country = s?.country.orEmpty(),
                identifierType = s?.companyIdentifierType.orEmpty(),
                identifierValue = (s?.companyIdentifierValue?.takeIf { it.isNotBlank() } ?: s?.nuit).orEmpty(),
                contact = s?.contact.orEmpty(),
                whatsApp = s?.whatsApp.orEmpty(),
                email = s?.email.orEmpty(),
                website = s?.website.orEmpty(),
            )
        }
    }

    fun setDocumentTemplateId(templateId: String) {
        viewModelScope.launch {
            companySettingsRepository.setDocumentTemplateId(templateId)
            _uiState.value = _uiState.value.copy(templateId = templateId)
        }
    }

    fun setCurrency(currency: String) {
        viewModelScope.launch {
            companySettingsRepository.setCurrency(currency)
            _uiState.value = _uiState.value.copy(currency = currency)
        }
    }

    fun updateDefaultTaxRate(rateText: String) {
        val fraction = (rateText.replace(',', '.').toDoubleOrNull() ?: 0.0) / 100.0
            .coerceIn(0.0, 1.0)
        viewModelScope.launch {
            companySettingsRepository.setDefaultTaxRate(fraction)
            _uiState.value = _uiState.value.copy(defaultTaxRate = fraction)
        }
    }

    fun updateName(v: String) { _uiState.value = _uiState.value.copy(name = v); persistProfile() }
    fun updateTradingName(v: String) { _uiState.value = _uiState.value.copy(tradingName = v); persistProfile() }
    fun updateAddress(v: String) { _uiState.value = _uiState.value.copy(address = v); persistProfile() }
    fun updateCity(v: String) { _uiState.value = _uiState.value.copy(city = v); persistProfile() }
    fun updateCountry(v: String) { _uiState.value = _uiState.value.copy(country = v); persistProfile() }
    fun updateIdentifierType(v: String) { _uiState.value = _uiState.value.copy(identifierType = v); persistProfile() }
    fun updateIdentifierValue(v: String) { _uiState.value = _uiState.value.copy(identifierValue = v); persistProfile() }
    fun updateContact(v: String) { _uiState.value = _uiState.value.copy(contact = v); persistProfile() }
    fun updateWhatsApp(v: String) { _uiState.value = _uiState.value.copy(whatsApp = v); persistProfile() }
    fun updateEmail(v: String) { _uiState.value = _uiState.value.copy(email = v); persistProfile() }
    fun updateWebsite(v: String) { _uiState.value = _uiState.value.copy(website = v); persistProfile() }

    private fun persistProfile() {
        val s = _uiState.value
        viewModelScope.launch {
            companySettingsRepository.setCompanyProfile(
                name = s.name,
                tradingName = s.tradingName.ifBlank { null },
                address = s.address,
                city = s.city.ifBlank { null },
                country = s.country.ifBlank { null },
                identifierType = s.identifierType.ifBlank { null },
                identifierValue = s.identifierValue.ifBlank { null },
                contact = s.contact,
                whatsApp = s.whatsApp.ifBlank { null },
                email = s.email.ifBlank { null },
                website = s.website.ifBlank { null },
            )
        }
    }

    fun saveLogoImage(uri: Uri) {
        saveImage(uri, "company", "logo.png") { path ->
            _uiState.value = _uiState.value.copy(logoPath = path)
        }
    }

    fun saveStampImage(uri: Uri) {
        saveImage(uri, "company", "stamp.png") { path ->
            _uiState.value = _uiState.value.copy(stampPath = path)
        }
    }

    fun saveSignatureImage(uri: Uri) {
        saveImage(uri, "company", "signature.png") { path ->
            _uiState.value = _uiState.value.copy(signaturePath = path)
        }
    }

    private fun saveImage(uri: Uri, dir: String, file: String, onSaved: (String?) -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val path = withContext(Dispatchers.IO) {
                ImageFiles.savePngFromUri(appContext, uri, dir, file)
            }
            if (path != null) {
                when (file) {
                    "logo.png" -> companySettingsRepository.setLogoPath(path)
                    "stamp.png" -> companySettingsRepository.setStampPath(path)
                    else -> companySettingsRepository.setDefaultSignaturePath(path)
                }
            }
            onSaved(path)
            _uiState.value = _uiState.value.copy(isSaving = false)
        }
    }

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                CompanySettingsViewModel(
                    appContext = app.applicationContext,
                    companySettingsRepository = app.companySettingsRepository,
                )
            }
        }
    }
}
