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

data class SignUpUiState(
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isBusy: Boolean = false,
    val configError: Boolean = false,
    val success: Boolean = false,
    val errorRes: Int? = null,
)

class SignUpViewModel(
    private val authManager: AuthManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SignUpUiState())
    val uiState: StateFlow<SignUpUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(email = value, errorRes = null)
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value, errorRes = null)
    }

    fun onConfirmPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(confirmPassword = value, errorRes = null)
    }

    fun signUp() {
        val current = _uiState.value
        val email = current.email.trim()
        if (current.isBusy || email.isEmpty() || current.password.isEmpty()) return
        if (current.password != current.confirmPassword) {
            _uiState.value = current.copy(errorRes = R.string.signup_error_mismatch)
            return
        }
        if (!authManager.isConfigured) {
            _uiState.value = current.copy(configError = true)
            return
        }
        viewModelScope.launch {
            _uiState.value = current.copy(isBusy = true)
            val result = authManager.signUp(email, current.password)
            _uiState.value = _uiState.value.copy(
                isBusy = false,
                success = result.isSuccess,
                errorRes = if (result.isFailure) R.string.signup_error_failed else null,
            )
        }
    }

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                SignUpViewModel(app.authManager)
            }
        }
    }
}
