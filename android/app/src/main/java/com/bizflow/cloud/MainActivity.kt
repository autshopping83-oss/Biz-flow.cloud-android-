package com.bizflow.cloud

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.bizflow.cloud.ui.auth.LoginScreen
import com.bizflow.cloud.ui.shell.AppShell
import com.bizflow.cloud.ui.theme.BizFlowTheme
import io.github.jan.supabase.gotrue.SessionStatus

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BizFlowTheme {
                AuthGate()
            }
        }
    }
}

@Composable
private fun AuthGate() {
    val authManager = (LocalContext.current.applicationContext as BizFlowApplication).authManager
    val sessionStatus by authManager.sessionStatus.collectAsState()
    when (sessionStatus) {
        is SessionStatus.Authenticated -> AppShell()
        SessionStatus.LoadingFromStorage -> AuthLoadingScreen()
        else -> LoginScreen()
    }
}

@Composable
private fun AuthLoadingScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}