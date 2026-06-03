package com.sverto.app.feature.accounts

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CallMade
import androidx.compose.material.icons.outlined.CallReceived
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import uniffi.sverto_core.TransactionListItem
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Suppress("LongMethod", "NewApi")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AccountTransactionsScreen(
    accountId: String,
    onBack: () -> Unit,
    onTransactionClick: (TransactionListItem) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
    viewModel: AccountTransactionsViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()

    LaunchedEffect(accountId) {
        viewModel.load(accountId)
    }

    val listState = rememberLazyListState()

    // Infinite scroll: load more when near the end
    LaunchedEffect(listState, state.hasMore, state.isLoadingMore) {
        snapshotFlow {
            listState.layoutInfo.visibleItemsInfo
                .lastOrNull()
                ?.index
        }.collect { lastVisibleIndex ->
            val totalItems = listState.layoutInfo.totalItemsCount
            val nearEnd = lastVisibleIndex != null && lastVisibleIndex >= totalItems - 5
            val canLoadMore = state.hasMore && !state.isLoadingMore && !state.isLoading
            if (nearEnd && canLoadMore) {
                viewModel.loadMore()
            }
        }
    }

    val groupedTransactions =
        state.items
            .sortedByDescending { it.date }
            .groupBy {
                Instant.ofEpochSecond(it.date).atZone(ZoneId.systemDefault()).toLocalDate()
            }.toSortedMap(compareByDescending { it })

    val today =
        @Suppress("NewApi")
        LocalDate.now()
    val yesterday =
        @Suppress("NewApi")
        today.minusDays(1)
    val dateFormatter =
        @Suppress("NewApi")
        DateTimeFormatter.ofPattern("MMM d, yyyy")

    val pullToRefreshState = rememberPullToRefreshState()

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = { Text("Transactions") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
            )
        },
    ) { padding ->
        when {
            state.isLoading -> {
                Box(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            state.error != null && state.items.isEmpty() -> {
                Box(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "Error: ${state.error}",
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
            else -> {
                PullToRefreshBox(
                    isRefreshing = isRefreshing,
                    onRefresh = viewModel::refresh,
                    state = pullToRefreshState,
                    indicator = {
                        PullToRefreshDefaults.LoadingIndicator(
                            state = pullToRefreshState,
                            isRefreshing = isRefreshing,
                            modifier = Modifier.align(Alignment.TopCenter),
                        )
                    },
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(padding),
                ) {
                    LazyColumn(
                        state = listState,
                    ) {
                        groupedTransactions.forEach { (date, txList) ->
                            val headerText =
                                when (date) {
                                    today -> "Today"
                                    yesterday -> "Yesterday"
                                    else -> date.format(dateFormatter)
                                }

                            item(key = "header-$date") {
                                Text(
                                    text = headerText,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                )
                            }

                            item(key = "group-$date") {
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                ) {
                                    with(sharedTransitionScope) {
                                        Column {
                                            txList.forEachIndexed { index, tx ->
                                                val icon = transactionIcon(tx.transactionType)
                                                val subtitle = tx.categoryName.ifEmpty { tx.typeLabel }

                                                ListItem(
                                                    modifier =
                                                        Modifier
                                                            .sharedBounds(
                                                                sharedContentState = rememberSharedContentState(key = "tx_${tx.id}"),
                                                                animatedVisibilityScope = animatedVisibilityScope,
                                                            ).clickable { onTransactionClick(tx) },
                                                    leadingContent = {
                                                        Icon(
                                                            imageVector = icon,
                                                            contentDescription = tx.typeLabel,
                                                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                                            modifier = Modifier.size(24.dp),
                                                        )
                                                    },
                                                    headlineContent = {
                                                        Text(
                                                            text = tx.description,
                                                            style = MaterialTheme.typography.bodyLarge,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis,
                                                        )
                                                    },
                                                    supportingContent = {
                                                        if (subtitle.isNotEmpty()) {
                                                            Text(
                                                                text = subtitle,
                                                                style = MaterialTheme.typography.bodySmall,
                                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                                maxLines = 1,
                                                                overflow = TextOverflow.Ellipsis,
                                                            )
                                                        }
                                                    },
                                                    trailingContent = {
                                                        Text(
                                                            text = tx.amountDisplay,
                                                            style = MaterialTheme.typography.bodyLarge,
                                                            color = MaterialTheme.colorScheme.onSurface,
                                                            maxLines = 1,
                                                        )
                                                    },
                                                    colors =
                                                        ListItemDefaults.colors(
                                                            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                                                        ),
                                                )
                                                if (index < txList.size - 1) {
                                                    HorizontalDivider(
                                                        modifier = Modifier.padding(horizontal = 16.dp),
                                                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (state.isLoadingMore) {
                            item {
                                Box(
                                    modifier =
                                        Modifier
                                            .fillMaxSize()
                                            .padding(16.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                }
                            }
                        }

                        item {
                            Spacer(Modifier.height(16.dp))
                        }
                    }
                }
            }
        }
    }
}

private fun transactionIcon(type: String): ImageVector =
    when (type) {
        "asset_purchase" -> Icons.Outlined.ShoppingCart
        "asset_sale" -> Icons.Outlined.Payments
        "cash_transfer_in" -> Icons.Outlined.CallReceived
        "cash_transfer_out" -> Icons.Outlined.CallMade
        "cash_dividend", "asset_dividend" -> Icons.Outlined.Payments
        "asset_trade" -> Icons.Outlined.SwapHoriz
        "asset_transfer_in" -> Icons.Outlined.CallReceived
        "asset_transfer_out" -> Icons.Outlined.CallMade
        "asset_balance_transfer" -> Icons.Outlined.SwapHoriz
        "account_fees" -> Icons.Outlined.Receipt
        "group" -> Icons.Outlined.Layers
        else -> Icons.Outlined.AccountBalance
    }
