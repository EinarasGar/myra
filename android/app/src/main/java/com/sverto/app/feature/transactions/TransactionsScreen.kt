package com.sverto.app.feature.transactions

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material.icons.outlined.Workspaces
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FloatingToolbarDefaults
import androidx.compose.material3.HorizontalFloatingToolbar
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.ui.TransactionListSkeleton
import com.sverto.app.feature.transactions.components.groupByDate
import com.sverto.app.feature.transactions.components.transactionDayItems
import com.sverto.app.feature.transactions.quickupload.QuickUploadUiItem
import com.sverto.app.feature.transactions.quickupload.QuickUploadsSection
import kotlinx.coroutines.flow.distinctUntilChanged
import uniffi.sverto_core.TransactionListItem
import uniffi.sverto_core.TransactionVisibility

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
    onGroupSelected: (List<String>) -> Unit,
    onQuickUpload: () -> Unit,
    quickUploadItems: List<QuickUploadUiItem>,
    onQuickUploadItemClick: (QuickUploadUiItem) -> Unit,
    onQuickUploadRetry: (String) -> Unit,
    onQuickUploadDismiss: (String) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
    onRefreshQuickUploads: (() -> Unit)? = null,
    viewModel: TransactionsViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()
    val selectedIds by viewModel.selectedIds.collectAsStateWithLifecycle()
    val isBulkBusy by viewModel.isBulkBusy.collectAsStateWithLifecycle()
    val selectionActive = selectedIds.isNotEmpty()
    val hasGhostSelected =
        remember(selectedIds, state.items) {
            state.items.any { item ->
                item.id in selectedIds &&
                    (
                        item.visibility == TransactionVisibility.GHOST ||
                            item.children.any { it.visibility == TransactionVisibility.GHOST }
                    )
            }
        }
    val selectedGroupCount =
        remember(selectedIds, state.items) {
            state.items.count { it.isGroup && it.id in selectedIds }
        }
    var showDeleteConfirmation by remember { mutableStateOf(false) }
    var showNewTransactionSheet by rememberSaveable { mutableStateOf(false) }
    var fabMenuExpanded by rememberSaveable { mutableStateOf(false) }

    BackHandler(fabMenuExpanded) { fabMenuExpanded = false }
    BackHandler(selectionActive) { viewModel.clearSelection() }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            state.isLoading && state.items.isEmpty() -> {
                TransactionListSkeleton(Modifier.fillMaxSize())
            }

            state.error != null && state.items.isEmpty() -> {
                ErrorState(message = state.error!!, onRetry = viewModel::load)
            }

            else -> {
                TransactionList(
                    transactions = state.items,
                    quickUploadItems = quickUploadItems,
                    isRefreshing = isRefreshing,
                    isLoadingMore = state.isLoadingMore,
                    onRefresh = {
                        viewModel.refresh()
                        onRefreshQuickUploads?.invoke()
                    },
                    onLoadMore = viewModel::loadMore,
                    onTransactionClick = onTransactionClick,
                    selectedIds = selectedIds,
                    selectionActive = selectionActive,
                    onToggleSelect = viewModel::toggleSelection,
                    onQuickUploadItemClick = onQuickUploadItemClick,
                    onQuickUploadRetry = onQuickUploadRetry,
                    onQuickUploadDismiss = onQuickUploadDismiss,
                    sharedTransitionScope = sharedTransitionScope,
                    animatedVisibilityScope = animatedVisibilityScope,
                )
            }
        }

        AnimatedVisibility(
            visible = !selectionActive,
            enter = scaleIn() + fadeIn(),
            exit = scaleOut() + fadeOut(),
            modifier =
                Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 24.dp),
        ) {
            FabMenu(
                expanded = fabMenuExpanded,
                onToggle = { fabMenuExpanded = !fabMenuExpanded },
                onQuickUpload = onQuickUpload,
                onManualEntry = { showNewTransactionSheet = true },
            )
        }

        AnimatedVisibility(
            visible = selectionActive,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter),
        ) {
            SelectionToolbar(
                count = selectedIds.size,
                isBusy = isBulkBusy,
                showMarkReviewed = hasGhostSelected,
                showGroup = selectedIds.size >= 2 && selectedGroupCount == 0,
                onClose = viewModel::clearSelection,
                onMarkReviewed = viewModel::markSelectedReviewed,
                onGroup = { onGroupSelected(selectedIds.toList()) },
                onDelete = { showDeleteConfirmation = true },
                modifier = Modifier.padding(bottom = 24.dp),
            )
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

    if (showDeleteConfirmation) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmation = false },
            title = { Text("Delete selection?") },
            text = {
                Text(
                    deleteConfirmationMessage(
                        transactionCount = selectedIds.size - selectedGroupCount,
                        groupCount = selectedGroupCount,
                    ),
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirmation = false
                        viewModel.deleteSelected()
                    },
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmation = false }) {
                    Text("Cancel")
                }
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
    quickUploadItems: List<QuickUploadUiItem>,
    isRefreshing: Boolean,
    isLoadingMore: Boolean,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit,
    onTransactionClick: (TransactionListItem) -> Unit,
    selectedIds: Set<String>,
    selectionActive: Boolean,
    onToggleSelect: (String) -> Unit,
    onQuickUploadItemClick: (QuickUploadUiItem) -> Unit,
    onQuickUploadRetry: (String) -> Unit,
    onQuickUploadDismiss: (String) -> Unit,
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

    val itemCount = quickUploadItems.size
    var previousItemCount by remember { mutableIntStateOf(itemCount) }
    LaunchedEffect(itemCount) {
        if (itemCount > previousItemCount) {
            listState.animateScrollToItem(0)
        }
        previousItemCount = itemCount
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
                item(key = "quick_uploads") {
                    QuickUploadsSection(
                        items = quickUploadItems,
                        onItemClick = onQuickUploadItemClick,
                        onRetry = onQuickUploadRetry,
                        onDismiss = onQuickUploadDismiss,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }

                transactionDayItems(
                    groupedTransactions = grouped,
                    selectedIds = selectedIds,
                    selectionActive = selectionActive,
                    onTransactionClick = onTransactionClick,
                    onToggleSelect = onToggleSelect,
                    sharedTransitionScope = sharedTransitionScope,
                    animatedVisibilityScope = animatedVisibilityScope,
                )

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

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun SelectionToolbar(
    count: Int,
    isBusy: Boolean,
    showMarkReviewed: Boolean,
    showGroup: Boolean,
    onClose: () -> Unit,
    onMarkReviewed: () -> Unit,
    onGroup: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    HorizontalFloatingToolbar(
        expanded = true,
        colors = FloatingToolbarDefaults.vibrantFloatingToolbarColors(),
        modifier = modifier,
    ) {
        IconButton(onClick = onClose) {
            Icon(
                imageVector = Icons.Filled.Close,
                contentDescription = "Exit selection",
            )
        }
        Text(
            text = "$count selected",
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.align(Alignment.CenterVertically),
        )
        Spacer(Modifier.width(8.dp))
        AnimatedVisibility(
            visible = showMarkReviewed,
            enter = expandHorizontally() + fadeIn(),
            exit = shrinkHorizontally() + fadeOut(),
        ) {
            FilledIconButton(
                onClick = onMarkReviewed,
                enabled = !isBusy,
            ) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = "Mark reviewed",
                )
            }
        }
        AnimatedVisibility(
            visible = showGroup,
            enter = expandHorizontally() + fadeIn(),
            exit = shrinkHorizontally() + fadeOut(),
        ) {
            IconButton(onClick = onGroup) {
                Icon(
                    imageVector = Icons.Outlined.Workspaces,
                    contentDescription = "Group transactions",
                )
            }
        }
        IconButton(onClick = onDelete, enabled = !isBusy) {
            Icon(
                imageVector = Icons.Outlined.Delete,
                contentDescription = "Delete",
            )
        }
    }
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

private fun deleteConfirmationMessage(
    transactionCount: Int,
    groupCount: Int,
): String {
    val transactions = "$transactionCount transaction${if (transactionCount == 1) "" else "s"}"
    val groups = "$groupCount group${if (groupCount == 1) "" else "s"}"
    val groupWarning = "Deleting a group also deletes the transactions inside it."
    return when {
        groupCount == 0 -> "Delete $transactions? This action can't be undone."
        transactionCount == 0 -> "Delete $groups? $groupWarning"
        else -> "Delete $transactions and $groups? $groupWarning"
    }
}
