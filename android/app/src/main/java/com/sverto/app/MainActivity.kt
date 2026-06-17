package com.sverto.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.LoadingIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView
import com.sverto.app.core.theme.LocalClerkTheme
import com.sverto.app.core.theme.SvertoTheme
import com.sverto.app.feature.onboarding.CURRENT_ONBOARDING_VERSION
import com.sverto.app.feature.onboarding.OnboardingScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AppStore

private const val CLERK_INIT_TIMEOUT_MS = 3_000L

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3ExpressiveApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SvertoTheme {
                val appStore = remember { (applicationContext as SvertoApp).appStore }
                if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
                    SignedInGate(appStore = appStore, signInKey = Unit)
                } else {
                    val isInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
                    val user by Clerk.userFlow.collectAsStateWithLifecycle()
                    val clerkTheme = LocalClerkTheme.current
                    val timedOut = remember { mutableStateOf(false) }
                    val hasCachedSession = remember { mutableStateOf(false) }

                    LaunchedEffect(Unit) {
                        hasCachedSession.value = withContext(Dispatchers.IO) { appStore.getCachedMe() != null }
                    }

                    LaunchedEffect(isInitialized) {
                        if (!isInitialized) {
                            delay(CLERK_INIT_TIMEOUT_MS)
                            if (!Clerk.isInitialized.value) {
                                timedOut.value = true
                            }
                        }
                    }

                    when {
                        isInitialized && user != null -> SignedInGate(appStore = appStore, signInKey = user)
                        isInitialized -> AuthView(clerkTheme = clerkTheme)
                        timedOut.value && hasCachedSession.value ->
                            SignedInGate(appStore = appStore, signInKey = Unit)
                        else -> LoadingScreen()
                    }
                }
            }
        }
    }
}

@Composable
private fun SignedInGate(
    appStore: AppStore,
    signInKey: Any?,
) {
    var onboarded by remember(signInKey) { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(signInKey) {
        appStore.onSignIn()
        onboarded = appStore.getOnboardingVersion() >= CURRENT_ONBOARDING_VERSION
    }
    when (onboarded) {
        null -> LoadingScreen()
        true -> MainScreen()
        false -> OnboardingScreen(onComplete = { onboarded = true })
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun LoadingScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        LoadingIndicator()
    }
}
