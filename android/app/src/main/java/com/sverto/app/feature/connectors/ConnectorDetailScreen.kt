package com.sverto.app.feature.connectors

import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import uniffi.sverto_core.CredentialMode
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ConnectorDetailScreen(
    providerKind: String,
    onBack: () -> Unit,
    onConnectionClick: (String) -> Unit,
    onConnect: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ConnectorsViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.load() }
    val connector = remember(providerKind) { CONNECTORS.first { it.kind == providerKind } }
    val connections = state.connections.filter { it.providerKind == providerKind }
    val dateFormatter = remember { SimpleDateFormat("d MMM yyyy", Locale.getDefault()) }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier =
            modifier
                .fillMaxSize()
                .nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text(connector.name) },
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
                text = "Connect",
                icon = "plug",
                onClick = onConnect,
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
            val hasConnections = connections.isNotEmpty()
            val scrollState = rememberScrollState()
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .then(if (hasConnections) Modifier.verticalScroll(scrollState) else Modifier)
                        .padding(horizontal = 16.dp),
            ) {
                Spacer(Modifier.height(8.dp))
                ProviderAvatar(
                    icon = connector.icon,
                    size = 64.dp,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = connector.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(24.dp))
                if (hasConnections) {
                    Text(
                        "Active connections",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surfaceBright,
                    ) {
                        Column {
                            connections.forEachIndexed { index, connection ->
                                val label =
                                    if (connection.providerKind == "truelayer") {
                                        "Bank connection"
                                    } else {
                                        when (connection.credentialMode) {
                                            CredentialMode.STORED -> "Stored key"
                                            CredentialMode.TRANSIENT -> "On-device key"
                                            CredentialMode.CLIENT_SUPPLIED -> "Client-driven"
                                        }
                                    }
                                val consent =
                                    connection.consentExpiresAt?.let {
                                        "Consent until ${dateFormatter.format(Date(it * 1000))}"
                                    }
                                ListItem(
                                    modifier =
                                        Modifier.clickable { onConnectionClick(connection.id) },
                                    colors =
                                        ListItemDefaults.colors(
                                            containerColor = MaterialTheme.colorScheme.surfaceBright,
                                        ),
                                    headlineContent = { Text(label) },
                                    supportingContent = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            StatusChip(connection.status)
                                            if (consent != null) {
                                                Text(
                                                    text = consent,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                    },
                                    trailingContent = {
                                        Icon(
                                            Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                                            contentDescription = null,
                                        )
                                    },
                                )
                                if (index < connections.lastIndex) HorizontalDivider()
                            }
                        }
                    }
                } else if (state.loading) {
                    ConnectionCardSkeleton()
                } else {
                    Box(
                        modifier =
                            Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        EmptyState(
                            icon = connector.icon,
                            title = "Nothing connected yet",
                            body =
                                "Connect to import your accounts and keep them in " +
                                    "sync automatically.",
                        )
                    }
                }
            }
        }
    }
}
