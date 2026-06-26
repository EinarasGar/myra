package com.sverto.app

import android.content.Intent
import android.net.Uri
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
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.core.content.IntentCompat
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
    private val sharedImageUris: MutableState<List<Uri>> = mutableStateOf(emptyList())

    @OptIn(ExperimentalMaterial3ExpressiveApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (savedInstanceState == null) {
            consumeSharedImages(intent)
        }
        setContent {
            SvertoTheme {
                val appStore = remember { (applicationContext as SvertoApp).appStore }
                val sharedImages = sharedImageUris.value
                val onSharedImagesHandled = { sharedImageUris.value = emptyList() }
                if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
                    SignedInGate(
                        appStore = appStore,
                        signInKey = Unit,
                        sharedImageUris = sharedImages,
                        onSharedImagesHandled = onSharedImagesHandled,
                    )
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
                        isInitialized && user != null ->
                            SignedInGate(
                                appStore = appStore,
                                signInKey = user,
                                sharedImageUris = sharedImages,
                                onSharedImagesHandled = onSharedImagesHandled,
                            )
                        isInitialized -> AuthView(clerkTheme = clerkTheme)
                        timedOut.value && hasCachedSession.value ->
                            SignedInGate(
                                appStore = appStore,
                                signInKey = Unit,
                                sharedImageUris = sharedImages,
                                onSharedImagesHandled = onSharedImagesHandled,
                            )
                        else -> LoadingScreen()
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        consumeSharedImages(intent)
    }

    private fun consumeSharedImages(intent: Intent?) {
        val uris = extractSharedImageUris(intent)
        if (uris.isNotEmpty()) {
            sharedImageUris.value = uris
            intent?.removeExtra(Intent.EXTRA_STREAM)
            intent?.action = Intent.ACTION_MAIN
        }
    }

    private fun extractSharedImageUris(intent: Intent?): List<Uri> {
        if (intent == null || intent.type?.startsWith("image/") != true) return emptyList()
        return when (intent.action) {
            Intent.ACTION_SEND ->
                IntentCompat
                    .getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
                    ?.let { listOf(it) }
                    ?: emptyList()
            Intent.ACTION_SEND_MULTIPLE ->
                IntentCompat
                    .getParcelableArrayListExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
                    ?.filterNotNull()
                    ?: emptyList()
            else -> emptyList()
        }
    }
}

@Composable
private fun SignedInGate(
    appStore: AppStore,
    signInKey: Any?,
    sharedImageUris: List<Uri>,
    onSharedImagesHandled: () -> Unit,
) {
    var onboarded by remember(signInKey) { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(signInKey) {
        appStore.onSignIn()
        onboarded = appStore.getOnboardingVersion() >= CURRENT_ONBOARDING_VERSION
    }
    when (onboarded) {
        null -> LoadingScreen()
        true ->
            MainScreen(
                sharedImageUris = sharedImageUris,
                onSharedImagesHandled = onSharedImagesHandled,
            )
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
