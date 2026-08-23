package com.sverto.app.feature.server

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sverto.app.core.icons.LucideIcon
import kotlinx.coroutines.delay
import uniffi.sverto_core.AuthMode

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ServerUrlScreen(
    lastUrl: String?,
    connectionStatus: ServerConnectionStatus,
    onCheckServer: (String) -> Unit,
    onContinue: () -> Unit,
    onBack: () -> Unit,
) {
    var url by remember(lastUrl) { mutableStateOf(lastUrl.orEmpty()) }
    val focusManager = LocalFocusManager.current
    val normalisedUrl = url.trim().trimEnd('/')
    val currentStatus = connectionStatus.forUrl(normalisedUrl)
    val isChecking = currentStatus is ServerConnectionStatus.Checking
    val isValidUrl = isPlausibleServerUrl(normalisedUrl)

    BackHandler(onBack = onBack)

    LaunchedEffect(normalisedUrl, connectionStatus) {
        if (currentStatus is ServerConnectionStatus.Idle && isValidUrl) {
            delay(700)
            focusManager.clearFocus()
            onCheckServer(normalisedUrl)
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            CenterAlignedTopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .imePadding()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))
            ServerHero(currentStatus)
            Spacer(Modifier.height(24.dp))
            Text(
                text = currentStatus.title(),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = currentStatus.description(),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(32.dp))
            if (currentStatus is ServerConnectionStatus.Found) {
                ServerFoundCard(currentStatus)
                TextButton(onClick = { url = "" }) {
                    Text("Use a different address")
                }
            } else {
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    enabled = !isChecking,
                    label = { Text(ServerCopy.SERVER_URL_LABEL) },
                    placeholder = { Text("https://finance.example.com") },
                    leadingIcon = { LucideIcon(name = "link", modifier = Modifier.size(20.dp)) },
                    trailingIcon =
                        if (url.isNotEmpty() && !isChecking) {
                            {
                                IconButton(onClick = { url = "" }) {
                                    LucideIcon(name = "x", modifier = Modifier.size(20.dp))
                                }
                            }
                        } else {
                            null
                        },
                    singleLine = true,
                    isError = currentStatus is ServerConnectionStatus.Error,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Uri,
                            imeAction = ImeAction.Done,
                        ),
                    keyboardActions =
                        KeyboardActions(
                            onDone = {
                                if (isValidUrl && !isChecking) {
                                    focusManager.clearFocus()
                                    onCheckServer(normalisedUrl)
                                }
                            },
                        ),
                    shape = MaterialTheme.shapes.extraLarge,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            when (currentStatus) {
                is ServerConnectionStatus.Error -> {
                    Spacer(Modifier.height(16.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        contentColor = MaterialTheme.colorScheme.onErrorContainer,
                        shape = MaterialTheme.shapes.large,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = currentStatus.message,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
                ServerConnectionStatus.Idle,
                is ServerConnectionStatus.Checking,
                is ServerConnectionStatus.Found,
                -> Unit
            }
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    focusManager.clearFocus()
                    if (currentStatus is ServerConnectionStatus.Found) {
                        onContinue()
                    } else {
                        onCheckServer(normalisedUrl)
                    }
                },
                enabled = isValidUrl && !isChecking,
                shapes = ButtonDefaults.shapes(shape = MaterialTheme.shapes.extraLarge),
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) {
                Text(
                    when (currentStatus) {
                        is ServerConnectionStatus.Found -> "Continue"
                        is ServerConnectionStatus.Checking -> "Checking…"
                        else -> "Check server"
                    },
                )
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun ServerHero(status: ServerConnectionStatus) {
    val containerColor =
        when (status) {
            is ServerConnectionStatus.Found -> MaterialTheme.colorScheme.tertiaryContainer
            is ServerConnectionStatus.Error -> MaterialTheme.colorScheme.errorContainer
            else -> MaterialTheme.colorScheme.primaryContainer
        }
    val contentColor =
        when (status) {
            is ServerConnectionStatus.Found -> MaterialTheme.colorScheme.onTertiaryContainer
            is ServerConnectionStatus.Error -> MaterialTheme.colorScheme.onErrorContainer
            else -> MaterialTheme.colorScheme.onPrimaryContainer
        }

    Surface(
        color = containerColor,
        contentColor = contentColor,
        shape = RoundedCornerShape(40.dp),
        modifier = Modifier.size(112.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            AnimatedContent(
                targetState = status,
                contentKey = { it::class },
                label = "serverStatus",
            ) { current ->
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    when (current) {
                        ServerConnectionStatus.Idle ->
                            LucideIcon(name = "server", tint = contentColor, modifier = Modifier.size(48.dp))
                        is ServerConnectionStatus.Checking -> LoadingIndicator(modifier = Modifier.size(48.dp))
                        is ServerConnectionStatus.Found ->
                            LucideIcon(name = "badge-check", tint = contentColor, modifier = Modifier.size(48.dp))
                        is ServerConnectionStatus.Error ->
                            LucideIcon(name = "triangle-alert", tint = contentColor, modifier = Modifier.size(48.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ServerFoundCard(status: ServerConnectionStatus.Found) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
        shape = MaterialTheme.shapes.extraLarge,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.tertiaryContainer,
                    contentColor = MaterialTheme.colorScheme.onTertiaryContainer,
                    shape = MaterialTheme.shapes.large,
                    modifier = Modifier.size(44.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        LucideIcon(
                            name = "server",
                            tint = MaterialTheme.colorScheme.onTertiaryContainer,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Server address",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = status.url,
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            ServerDetailRow(
                icon = "package",
                label = "Version",
                value = status.serverInfo.version.ifBlank { "Unknown" },
            )
            ServerDetailRow(
                icon = "key-round",
                label = "Sign-in method",
                value = status.serverInfo.authMode.displayName(),
            )
        }
    }
}

@Composable
private fun ServerDetailRow(
    icon: String,
    label: String,
    value: String,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LucideIcon(
            name = icon,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(text = value, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

private fun ServerConnectionStatus.forUrl(url: String): ServerConnectionStatus =
    when (this) {
        ServerConnectionStatus.Idle -> this
        is ServerConnectionStatus.Checking -> if (this.url == url) this else ServerConnectionStatus.Idle
        is ServerConnectionStatus.Found -> if (this.url == url) this else ServerConnectionStatus.Idle
        is ServerConnectionStatus.Error -> if (this.url == url) this else ServerConnectionStatus.Idle
    }

private fun ServerConnectionStatus.title(): String =
    when (this) {
        ServerConnectionStatus.Idle -> "Connect your server"
        is ServerConnectionStatus.Checking -> "Looking for Sverto…"
        is ServerConnectionStatus.Found -> "Sverto server found"
        is ServerConnectionStatus.Error -> "Server not found"
    }

private fun ServerConnectionStatus.description(): String =
    when (this) {
        ServerConnectionStatus.Idle -> "Enter your self-hosted Sverto address. We'll verify it before connecting."
        is ServerConnectionStatus.Checking -> "Checking the address and reading its configuration."
        is ServerConnectionStatus.Found -> "This server is ready. Review the details and continue to sign in."
        is ServerConnectionStatus.Error -> "Sverto didn't respond at this address."
    }

private fun AuthMode.displayName(): String =
    when (this) {
        AuthMode.CLERK -> "Clerk"
        AuthMode.DATABASE -> "Username and password"
        AuthMode.NOAUTH -> "No sign-in"
    }

private fun isPlausibleServerUrl(value: String): Boolean =
    runCatching {
        val uri = Uri.parse(value)
        uri.scheme in setOf("http", "https") && !uri.host.isNullOrBlank()
    }.getOrDefault(false)
