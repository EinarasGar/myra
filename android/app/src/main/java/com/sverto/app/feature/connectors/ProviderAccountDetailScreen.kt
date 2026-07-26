package com.sverto.app.feature.connectors

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import uniffi.sverto_core.ProviderAccountTransaction
import uniffi.sverto_core.formatMoney
import java.text.DecimalFormat

@Suppress("LongMethod")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ProviderAccountDetailScreen(
    connectionId: String,
    providerAccountId: String,
    displayName: String,
    currency: String?,
    onBack: () -> Unit,
    onLinked: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProviderAccountDetailViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(connectionId, providerAccountId) {
        viewModel.load(connectionId, providerAccountId)
    }
    LaunchedEffect(state.justLinked) {
        if (state.justLinked) onLinked()
    }
    var picking by remember { mutableStateOf(false) }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier =
            modifier
                .fillMaxSize()
                .nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text(humanizeAccountName(displayName)) },
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
            if (!state.loading && state.linkedTo == null) {
                HeroButton(
                    text = "Link account",
                    onClick = { picking = true },
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 12.dp)
                            .navigationBarsPadding(),
                )
            }
        },
    ) { innerPadding ->
        LazyColumn(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 16.dp),
        ) {
            item {
                Text(
                    text =
                        listOfNotNull(
                            currency,
                            state.linkedTo?.let { "Linked to $it" } ?: "Not linked",
                        ).joinToString(" · "),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
            }
            item {
                state.error?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                    Spacer(Modifier.height(16.dp))
                }
            }
            if (state.loading && state.transactions.isEmpty()) {
                item { BindingRowsSkeleton() }
            } else if (state.transactions.isEmpty() && state.error == null) {
                item {
                    EmptyState(
                        icon = "inbox",
                        title = "No transactions fetched yet",
                        body = "Transactions appear here after this account's history has been fetched.",
                        modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
                    )
                }
            } else {
                itemsIndexed(state.transactions) { index, tx ->
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceBright,
                        shape =
                            when {
                                state.transactions.size == 1 -> RoundedCornerShape(20.dp)
                                index == 0 ->
                                    RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
                                index == state.transactions.lastIndex ->
                                    RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp)
                                else -> RoundedCornerShape(0.dp)
                            },
                    ) {
                        Column {
                            TransactionPreviewRow(tx)
                            if (index < state.transactions.lastIndex) HorizontalDivider()
                        }
                    }
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }

    if (picking) {
        AccountPickerSheet(
            accounts = state.svertoAccounts,
            onSelect = { sverto ->
                viewModel.bind(connectionId, providerAccountId, sverto.id)
                picking = false
            },
            onDismiss = { picking = false },
        )
    }
}

private val quantityFormat = DecimalFormat("#,##0.########")

private fun formatQuantity(quantity: Double): String = quantityFormat.format(quantity)

@Composable
private fun TransactionPreviewRow(tx: ProviderAccountTransaction) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .heightIn(min = 56.dp)
                .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = tx.description.ifBlank { "(no description)" },
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 2,
            )
            Text(
                text =
                    listOfNotNull(
                        absoluteDate(tx.date),
                        tx.quantity?.let { q -> tx.assetIdentifier?.let { "${formatQuantity(q)} × $it" } },
                    ).joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            text = formatMoney(tx.amount, tx.currency, true),
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}
