package com.sverto.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.LoadingIndicator
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView
import com.sverto.app.core.theme.LocalClerkTheme
import com.sverto.app.core.theme.SvertoTheme
import kotlinx.coroutines.delay

private const val CLERK_INIT_TIMEOUT_MS = 3_000L

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3ExpressiveApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SvertoTheme {
                if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
                    MainScreen()
                } else {
                    val isInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
                    val user by Clerk.userFlow.collectAsStateWithLifecycle()
                    val clerkTheme = LocalClerkTheme.current
                    val timedOut = remember { mutableStateOf(false) }
                    val apiClient = remember { (applicationContext as SvertoApp).apiClient }
                    val hasCachedSession = remember { apiClient.getCachedMe() != null }

                    LaunchedEffect(isInitialized) {
                        if (!isInitialized) {
                            delay(CLERK_INIT_TIMEOUT_MS)
                            if (!Clerk.isInitialized.value) {
                                timedOut.value = true
                            }
                        }
                    }

                    when {
                        isInitialized && user != null -> MainScreen()
                        isInitialized -> AuthView(clerkTheme = clerkTheme)
                        timedOut.value && hasCachedSession -> MainScreen()
                        else -> {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                LoadingIndicator()
                            }
                        }
                    }
                }
            }
        }
    }
}
