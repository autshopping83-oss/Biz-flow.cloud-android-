package com.bizflow.cloud.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.ViewModelProvider.Factory
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.auth.AuthManager
import io.github.jan.supabase.gotrue.SessionStatus
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

data class AccountUiState(
    val connected: Boolean = false,
    val email: String? = null,
    val configError: Boolean = false,
    val busy: Boolean = false,
    val error: String? = null,
)

class AccountViewModel(
    private val authManager: AuthManager,
) : ViewModel() {

    val uiState: StateFlow<AccountUiState> = authManager.sessionStatus
        .map { status ->
            val session = (status as? SessionStatus.Authenticated)?.session
            AccountUiState(
                connected = session != null,
                email = session?.user?.email,
                configError = !authManager.isConfigured,
            )
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.Eagerly,
            initialValue = AccountUiState(),
        )

    companion object {
        val Factory: Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as BizFlowApplication
                AccountViewModel(app.authManager)
            }
        }
    }
}
