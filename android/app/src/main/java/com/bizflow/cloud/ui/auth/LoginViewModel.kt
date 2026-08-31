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

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isBusy: Boolean = false,
    val configError: Boolean = false,
    val errorRes: Int? = null,
)

class LoginViewModel(
    private val authManager: AuthManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(email = value, errorRes = null)
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value, errorRes = null)
    }

    fun signIn() {
        submit { authManager.signIn(email(), password()) }
    }

    fun signUp() {
        submit { authManager.signUp(email(), password()) }
    }

    private fun email(): String = _uiState.value.email.trim()
    private fun password(): String = _uiState.value.password

    private fun submit(block: suspend () -> Result<Unit>) {
        val current = _uiState.value
        if (current.isBusy || email().isEmpty() || password().isEmpty()) return
        if (!authManager.isConfigured) {
            _uiState.value = current.copy(configError = true)
            return
        }
        viewModelScope.launch {
            _uiState.value = current.copy(isBusy = true)
            val result = block()
            _uiState.value = _uiState.value.copy(
                isBusy = false,
                errorRes = if (result.isFailure) R.string.login_error_invalid else null,
            )
        }
    }

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                LoginViewModel(app.authManager)
            }
        }
    }
}