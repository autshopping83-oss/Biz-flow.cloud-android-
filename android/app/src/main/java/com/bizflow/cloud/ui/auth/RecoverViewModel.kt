package com.bizflow.cloud.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.R
import com.bizflow.cloud.data.auth.AuthManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RecoverUiState(
    val email: String = "",
    val isBusy: Boolean = false,
    val configError: Boolean = false,
    val sent: Boolean = false,
    val errorRes: Int? = null,
)

class RecoverViewModel(
    private val authManager: AuthManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RecoverUiState())
    val uiState: StateFlow<RecoverUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(email = value, errorRes = null)
    }

    fun submit() {
        val current = _uiState.value
        val email = current.email.trim()
        if (current.isBusy || email.isEmpty()) return
        if (!authManager.isConfigured) {
            _uiState.value = current.copy(configError = true)
            return
        }
        viewModelScope.launch {
            _uiState.value = current.copy(isBusy = true)
            val result = authManager.resetPasswordForEmail(email)
            _uiState.value = _uiState.value.copy(
                isBusy = false,
                sent = result.isSuccess,
                errorRes = if (result.isFailure) R.string.recover_error_failed else null,
            )
        }
    }

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                RecoverViewModel(app.authManager)
            }
        }
    }
}
