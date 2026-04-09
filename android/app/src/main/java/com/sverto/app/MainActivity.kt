package com.sverto.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.LoadingIndicator
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView
import com.sverto.app.core.theme.LocalClerkTheme
import com.sverto.app.core.theme.SvertoTheme
import com.sverto.app.feature.portfolio.HomeScreen

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3ExpressiveApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SvertoTheme {
                if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
                    HomeScreen()
                } else {
                    val isInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
                    val user by Clerk.userFlow.collectAsStateWithLifecycle()
                    val clerkTheme = LocalClerkTheme.current

                    when {
                        !isInitialized -> {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                LoadingIndicator()
                            }
                        }
                        user != null -> HomeScreen()
                        else -> AuthView(clerkTheme = clerkTheme)
                    }
                }
            }
        }
    }
}
