package com.sverto.app.feature.connectors

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ButtonGroupDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.ToggleButton
import androidx.compose.material3.ToggleButtonDefaults
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import uniffi.sverto_core.CredentialMode

private enum class T212Mode(
    val label: String,
    val credentialMode: CredentialMode?,
    val explanation: String,
) {
    STORED(
        "Stored",
        CredentialMode.STORED,
        "Your API key is encrypted and kept on Sverto's servers. Syncs can run in the " +
            "background and work from all your devices.",
    ),
    ON_DEVICE(
        "On-device",
        CredentialMode.TRANSIENT,
        "Your API key never leaves this device — it is kept in this app's local storage " +
            "and sent only with each sync you trigger. Syncs run only while the app is open, " +
            "and other devices need their own key.",
    ),
    CLIENT(
        "Client-driven",
        null,
        "Coming soon — your device fetches data from Trading 212 directly and uploads it to Sverto.",
    ),
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ConnectTrading212Screen(
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ConnectTrading212ViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var mode by remember { mutableStateOf(T212Mode.STORED) }
    var apiKeyId by remember { mutableStateOf("") }
    var apiKey by remember { mutableStateOf("") }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier =
            modifier
                .fillMaxSize()
                .nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text("Connect Trading 212") },
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
            HeroButton(
                text = if (mode == T212Mode.CLIENT) "Coming soon" else "Connect",
                onClick = {
                    mode.credentialMode?.let { viewModel.connect(it, apiKeyId, apiKey, onCreated) }
                },
                enabled = mode.credentialMode != null && apiKey.isNotBlank() && !state.submitting,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 12.dp)
                        .navigationBarsPadding(),
            )
        },
    ) { innerPadding ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
        ) {
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
            ) {
                Row(
                    horizontalArrangement =
                        Arrangement.spacedBy(ButtonGroupDefaults.ConnectedSpaceBetween),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    val leadingShapes = ButtonGroupDefaults.connectedLeadingButtonShapes()
                    val middleShapes = ButtonGroupDefaults.connectedMiddleButtonShapes()
                    val trailingShapes = ButtonGroupDefaults.connectedTrailingButtonShapes()
                    val colors =
                        ToggleButtonDefaults.toggleButtonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                        )
                    T212Mode.entries.forEachIndexed { index, entry ->
                        ToggleButton(
                            checked = mode == entry,
                            onCheckedChange = { mode = entry },
                            modifier =
                                Modifier
                                    .weight(1f)
                                    .semantics { role = Role.RadioButton },
                            shapes =
                                when (index) {
                                    0 -> leadingShapes
                                    T212Mode.entries.lastIndex -> trailingShapes
                                    else -> middleShapes
                                },
                            colors = colors,
                        ) {
                            Text(entry.label, maxLines = 1)
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceBright,
                ) {
                    Text(
                        mode.explanation,
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (mode.credentialMode != null) {
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = apiKeyId,
                        onValueChange = { apiKeyId = it },
                        label = { Text("API key ID") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = apiKey,
                        onValueChange = { apiKey = it },
                        label = { Text("API key") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                state.error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}
