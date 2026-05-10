package com.sverto.app.feature.transactions

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CallMade
import androidx.compose.material.icons.outlined.CallReceived
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFloatingActionButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.state.UiState
import com.sverto.app.core.ui.TransactionListSkeleton
import kotlinx.coroutines.flow.distinctUntilChanged
import uniffi.sverto_core.TransactionListItem
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalMaterial3ExpressiveApi::class,
    ExperimentalSharedTransitionApi::class,
)
@Composable
fun TransactionsScreen(
    onTransactionClick: (TransactionListItem) -> Unit,
    onCreateTransaction: (String) -> Unit,
    onCreateGroup: () -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
    viewModel: TransactionsViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()
    val isLoadingMore by viewModel.isLoadingMore.collectAsStateWithLifecycle()
    var showNewTransactionSheet by rememberSaveable { mutableStateOf(false) }

    Box(modifier = modifier.fillMaxSize()) {
        when (val state = uiState) {
            is UiState.Loading -> {
                TransactionListSkeleton(Modifier.fillMaxSize())
            }

            is UiState.Error -> {
                ErrorState(message = state.message, onRetry = viewModel::load)
            }

            is UiState.Success -> {
                TransactionList(
                    transactions = state.data.transactions,
                    isRefreshing = isRefreshing,
                    isLoadingMore = isLoadingMore,
                    onRefresh = viewModel::refresh,
                    onLoadMore = viewModel::loadMore,
                    onTransactionClick = onTransactionClick,
                    sharedTransitionScope = sharedTransitionScope,
                    animatedVisibilityScope = animatedVisibilityScope,
                )
            }
        }

        MediumFloatingActionButton(
            onClick = { showNewTransactionSheet = true },
            modifier =
                Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 24.dp),
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add transaction")
        }
    }

    if (showNewTransactionSheet) {
        NewTransactionSheet(
            onDismiss = { showNewTransactionSheet = false },
            onSelectType = { typeKey ->
                showNewTransactionSheet = false
                onCreateTransaction(typeKey)
            },
            onSelectGroup = {
                showNewTransactionSheet = false
                onCreateGroup()
            },
        )
    }
}

@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalMaterial3ExpressiveApi::class,
    ExperimentalSharedTransitionApi::class,
)
@Composable
@Suppress("LongParameterList")
private fun TransactionList(
    transactions: List<TransactionListItem>,
    isRefreshing: Boolean,
    isLoadingMore: Boolean,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit,
    onTransactionClick: (TransactionListItem) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
) {
    val pullToRefreshState = rememberPullToRefreshState()
    val listState = rememberLazyListState()
    val currentOnLoadMore by rememberUpdatedState(onLoadMore)

    LaunchedEffect(listState) {
        snapshotFlow {
            val layoutInfo = listState.layoutInfo
            val totalItems = layoutInfo.totalItemsCount
            val lastVisible = (layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) + 1
            val nearEnd = totalItems > 0 && lastVisible > (totalItems - LOAD_MORE_BUFFER)
            Pair(nearEnd, totalItems)
        }.distinctUntilChanged()
            .collect { (nearEnd, _) ->
                if (nearEnd) currentOnLoadMore()
            }
    }

    val grouped = remember(transactions) { groupByDate(transactions) }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        state = pullToRefreshState,
        indicator = {
            PullToRefreshDefaults.LoadingIndicator(
                state = pullToRefreshState,
                isRefreshing = isRefreshing,
                modifier = Modifier.align(Alignment.TopCenter),
            )
        },
        modifier = modifier.fillMaxSize(),
    ) {
        if (transactions.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "No transactions yet",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(bottom = 16.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                grouped.forEach { (dateLabel, groupItems) ->
                    stickyHeader(key = dateLabel) {
                        DateHeader(dateLabel)
                    }
                    item(key = "card_$dateLabel") {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerHigh,
                            modifier =
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp)
                                    .animateItem(
                                        placementSpec =
                                            spring(
                                                dampingRatio = Spring.DampingRatioLowBouncy,
                                                stiffness = Spring.StiffnessLow,
                                            ),
                                    ),
                        ) {
                            Column {
                                groupItems.forEachIndexed { index, transaction ->
                                    TransactionRow(
                                        transaction = transaction,
                                        onClick = { onTransactionClick(transaction) },
                                        sharedTransitionScope = sharedTransitionScope,
                                        animatedVisibilityScope = animatedVisibilityScope,
                                    )
                                    if (index < groupItems.lastIndex) {
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

                if (isLoadingMore) {
                    item {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            LoadingIndicator()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DateHeader(label: String) {
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier =
            Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(
                    start = 16.dp,
                    end = 16.dp,
                    top = 16.dp,
                    bottom = 8.dp,
                ),
    )
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun TransactionRow(
    transaction: TransactionListItem,
    onClick: () -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
) {
    val icon = transactionIcon(transaction.transactionType)

    with(sharedTransitionScope) {
        ListItem(
            modifier =
                Modifier
                    .sharedBounds(
                        sharedContentState = rememberSharedContentState(key = "tx_${transaction.id}"),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ).clickable(onClick = onClick),
            colors =
                ListItemDefaults.colors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                ),
            leadingContent = {
                Icon(
                    imageVector = icon,
                    contentDescription = transaction.typeLabel,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(24.dp),
                )
            },
            headlineContent = {
                Text(
                    text = transaction.description,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            },
            supportingContent = {
                val subtitle =
                    transaction.categoryName.ifEmpty {
                        transaction.typeLabel
                    }
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
                    text = transaction.amountDisplay,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                )
            },
        )
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

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(
                imageVector = Icons.Outlined.Warning,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = message,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = "Check your connection and try again",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
            )
            Spacer(Modifier.height(8.dp))
            FilledTonalButton(onClick = onRetry) {
                Text("Retry")
            }
        }
    }
}

private const val LOAD_MORE_BUFFER = 3

private val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)

private fun groupByDate(transactions: List<TransactionListItem>): List<Pair<String, List<TransactionListItem>>> {
    val today = LocalDate.now()
    val yesterday = today.minusDays(1)

    return transactions
        .groupBy { tx ->
            val date =
                Instant
                    .ofEpochSecond(tx.date)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate()
            when (date) {
                today -> "Today"
                yesterday -> "Yesterday"
                else -> date.format(dateFormatter)
            }
        }.toList()
}
