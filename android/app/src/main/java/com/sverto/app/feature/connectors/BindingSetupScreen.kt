package com.sverto.app.feature.connectors

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import uniffi.sverto_core.ProviderAccount

@Suppress("LongMethod")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun BindingSetupScreen(
    connectionId: String,
    onBack: () -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BindingSetupViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(connectionId) { viewModel.load(connectionId) }
    var pickingFor by remember { mutableStateOf<ProviderAccount?>(null) }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier =
            modifier
                .fillMaxSize()
                .nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text("Link accounts") },
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
                text = "Done",
                onClick = onDone,
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
                Text(
                    text =
                        "Choose which Sverto account each imported account writes into. " +
                            "You can skip any and add them later.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(24.dp))
                Text(
                    "Accounts",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(8.dp))
                if (state.providerAccounts.isEmpty() && state.loading) {
                    BindingRowsSkeleton()
                } else {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surfaceBright,
                    ) {
                        Column {
                            state.providerAccounts.forEachIndexed { index, account ->
                                val boundName = state.boundAccounts[account.providerAccountId]
                                val bound = boundName != null
                                Row(
                                    modifier =
                                        Modifier
                                            .fillMaxWidth()
                                            .clickable(enabled = !bound) { pickingFor = account }
                                            .heightIn(min = 56.dp)
                                            .padding(horizontal = 16.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            humanizeAccountName(account.displayName),
                                            style = MaterialTheme.typography.bodyLarge,
                                        )
                                        Text(
                                            text =
                                                when {
                                                    boundName != null -> "Linked to $boundName"
                                                    account.currency != null -> account.currency!!
                                                    else -> "Not linked"
                                                },
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    if (bound) {
                                        Icon(
                                            Icons.Outlined.CheckCircle,
                                            contentDescription = "Linked",
                                            tint = MaterialTheme.colorScheme.primary,
                                        )
                                    } else {
                                        FilledTonalButton(
                                            onClick = { pickingFor = account },
                                            contentPadding = PaddingValues(horizontal = 16.dp),
                                            modifier = Modifier.heightIn(min = 40.dp),
                                        ) {
                                            Text("Link")
                                        }
                                    }
                                }
                                if (index < state.providerAccounts.lastIndex) HorizontalDivider()
                            }
                            if (state.providerAccounts.isEmpty()) {
                                Text(
                                    "No provider accounts available.",
                                    modifier = Modifier.padding(16.dp),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    pickingFor?.let { target ->
        AccountPickerSheet(
            accounts = state.svertoAccounts,
            onSelect = { sverto ->
                viewModel.bind(connectionId, target.providerAccountId, sverto.id)
                pickingFor = null
            },
            onDismiss = { pickingFor = null },
        )
    }
}
