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
    val currency: String = CurrencyCatalog.DEFAULT_CODE,
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
            val settings = companySettingsRepository.getSettings()
            _uiState.value = CompanySettingsUiState(
                templateId = settings?.documentTemplateId ?: CompanySettingsEntity.DEFAULT_TEMPLATE_ID,
                logoPath = settings?.logoPath,
                stampPath = settings?.stampPath,
                currency = settings?.currency ?: CurrencyCatalog.DEFAULT_CODE,
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

    private fun saveImage(uri: Uri, dir: String, file: String, onSaved: (String?) -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val path = withContext(Dispatchers.IO) {
                ImageFiles.savePngFromUri(appContext, uri, dir, file)
            }
            if (path != null) {
                when (dir) {
                    "company" -> companySettingsRepository.setLogoPath(path)
                    else -> companySettingsRepository.setStampPath(path)
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