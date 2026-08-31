package com.bizflow.cloud

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.bizflow.cloud.ui.shell.AppShell
import com.bizflow.cloud.ui.theme.BizFlowTheme
import io.github.jan.supabase.annotations.SupabaseInternal
import io.github.jan.supabase.gotrue.handleDeeplinks

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        handleAuthDeeplink(intent)
        setContent {
            BizFlowTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppShell()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleAuthDeeplink(intent)
    }

    @OptIn(SupabaseInternal::class)
    private fun handleAuthDeeplink(intent: Intent) {
        val client = (application as BizFlowApplication).supabaseClient ?: return
        client.handleDeeplinks(intent)
    }
}
