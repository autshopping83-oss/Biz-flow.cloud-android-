package com.bizflow.cloud.ui.more

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.local.entity.CompanySettingsEntity
import com.bizflow.cloud.data.repository.CompanySettingsRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MoreViewModel(
    private val companySettingsRepository: CompanySettingsRepository,
) : ViewModel() {
    val documentTemplateId: StateFlow<String> = companySettingsRepository
        .observeDocumentTemplateId()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = CompanySettingsEntity.DEFAULT_TEMPLATE_ID,
        )

    fun setDocumentTemplateId(templateId: String) {
        viewModelScope.launch {
            companySettingsRepository.setDocumentTemplateId(templateId)
        }
    }

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                MoreViewModel(app.companySettingsRepository)
            }
        }
    }
}