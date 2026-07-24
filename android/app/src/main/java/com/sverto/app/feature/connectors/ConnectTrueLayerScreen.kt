package com.sverto.app.feature.connectors

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.icons.LucideIcon

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ConnectTrueLayerScreen(
    oauthState: String?,
    oauthCode: String?,
    oauthError: String?,
    onBack: () -> Unit,
    onCompleted: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ConnectTrueLayerViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(oauthState) {
        if (oauthState != null) viewModel.complete(oauthState, oauthCode, oauthError)
    }
    LaunchedEffect(state.launchUrl) {
        state.launchUrl?.let { url ->
            viewModel.consumeLaunchUrl()
            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
        }
    }
    LaunchedEffect(state.phase) {
        if (state.phase == TrueLayerPhase.COMPLETED) {
            val connectionId = state.connectionId
            viewModel.consumeCompleted()
            connectionId?.let(onCompleted)
        }
    }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier =
            modifier
                .fillMaxSize()
                .nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text("Connect your bank") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer,
                        scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                    ),
                scrollBehavior = scrollBehavior,
            )
        },
        bottomBar = {
            if (state.phase != TrueLayerPhase.WORKING) {
                HeroButton(
                    text = "Continue to your bank",
                    icon = "landmark",
                    onClick = { viewModel.begin() },
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 12.dp)
                            .navigationBarsPadding(),
                )
            }
        },
    ) { innerPadding ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
        ) {
            if (state.phase == TrueLayerPhase.WORKING) {
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    LoadingIndicator(modifier = Modifier.size(72.dp))
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Connecting your bank…",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                return@Box
            }
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
            ) {
                ProviderAvatar(
                    icon = "landmark",
                    size = 64.dp,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
                Spacer(Modifier.height(24.dp))
                Text(
                    "Link your bank securely through Open Banking. Here's how it works:",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Spacer(Modifier.height(20.dp))
                TrueLayerStep(icon = "landmark", text = "Choose your bank")
                Spacer(Modifier.height(12.dp))
                TrueLayerStep(
                    icon = "shield-check",
                    text = "Approve access at your bank — Sverto never sees your login",
                )
                Spacer(Modifier.height(12.dp))
                TrueLayerStep(icon = "refresh-cw", text = "Your transactions import automatically")
                Spacer(Modifier.height(16.dp))
                when (state.phase) {
                    TrueLayerPhase.DENIED ->
                        Text(
                            "Access was denied at the bank. You can try again.",
                            color = MaterialTheme.colorScheme.error,
                        )
                    TrueLayerPhase.FAILED ->
                        Text(
                            state.error ?: "Something went wrong. Try again.",
                            color = MaterialTheme.colorScheme.error,
                        )
                    else -> {}
                }
            }
        }
    }
}

@Composable
private fun TrueLayerStep(
    icon: String,
    text: String,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        LucideIcon(
            name = icon,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp),
        )
        Spacer(Modifier.size(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium)
    }
}
