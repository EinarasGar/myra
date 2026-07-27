package com.sverto.app.feature.transactions

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.foundation.text.input.clearText
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.ExpandedFullScreenSearchBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.SearchBarState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.feature.transactions.components.groupByDate
import com.sverto.app.feature.transactions.components.transactionDayItems
import com.sverto.app.feature.transactions.create.EmptySearchMessage
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import uniffi.sverto_core.TransactionListItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionSearchAppBar(
    searchBarState: SearchBarState,
    textFieldState: TextFieldState,
    listState: LazyListState,
    onTransactionClick: (TransactionListItem) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TransactionSearchViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        snapshotFlow { textFieldState.text.toString() }
            .collect { viewModel.onQueryChange(it) }
    }

    Surface(
        onClick = { scope.launch { searchBarState.animateToExpanded() } },
        shape = RoundedCornerShape(percent = 50),
        color = MaterialTheme.colorScheme.surfaceBright,
        modifier = modifier.fillMaxWidth().height(48.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                "Search transactions",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }

    val inputField: @Composable () -> Unit = {
        SearchBarDefaults.InputField(
            textFieldState = textFieldState,
            searchBarState = searchBarState,
            onSearch = {},
            placeholder = { Text("Search transactions") },
            leadingIcon = {
                IconButton(onClick = { scope.launch { searchBarState.animateToCollapsed() } }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            trailingIcon = {
                if (textFieldState.text.isNotEmpty()) {
                    IconButton(onClick = { textFieldState.clearText() }) {
                        Icon(Icons.Outlined.Cancel, contentDescription = "Clear")
                    }
                }
            },
        )
    }

    ExpandedFullScreenSearchBar(state = searchBarState, inputField = inputField) {
        TransactionSearchResults(
            state = state,
            listState = listState,
            onLoadMore = viewModel::loadMore,
            onTransactionClick = onTransactionClick,
        )
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun TransactionSearchResults(
    state: TransactionSearchState,
    listState: LazyListState,
    onLoadMore: () -> Unit,
    onTransactionClick: (TransactionListItem) -> Unit,
) {
    val grouped = remember(state.items) { groupByDate(state.items) }
    val currentOnLoadMore by rememberUpdatedState(onLoadMore)
    LaunchedEffect(listState) {
        snapshotFlow {
            val layoutInfo = listState.layoutInfo
            val totalItems = layoutInfo.totalItemsCount
            val lastVisible = (layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) + 1
            totalItems > 0 && lastVisible > (totalItems - LOAD_MORE_BUFFER)
        }.distinctUntilChanged()
            .collect { nearEnd -> if (nearEnd) currentOnLoadMore() }
    }

    LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
        transactionDayItems(
            groupedTransactions = grouped,
            selectedIds = emptySet(),
            selectionActive = false,
            onTransactionClick = onTransactionClick,
            onToggleSelect = null,
            sharedTransitionScope = null,
            animatedVisibilityScope = null,
        )

        if (state.isLoading || state.isLoadingMore) {
            item {
                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    LoadingIndicator()
                }
            }
        }

        if (!state.isLoading && state.items.isEmpty()) {
            item {
                val error = state.error
                when {
                    error != null ->
                        EmptySearchMessage(
                            icon = Icons.Outlined.ErrorOutline,
                            iconTint = MaterialTheme.colorScheme.error,
                            title = "Search failed",
                            subtitle = error,
                        )

                    state.query.isBlank() ->
                        EmptySearchMessage(
                            icon = Icons.Outlined.Search,
                            iconTint = MaterialTheme.colorScheme.onSurfaceVariant,
                            title = "Search transactions",
                            subtitle = "Find by description",
                        )

                    else ->
                        EmptySearchMessage(
                            icon = Icons.Outlined.Search,
                            iconTint = MaterialTheme.colorScheme.onSurfaceVariant,
                            title = "No results",
                            subtitle = "No transactions match \"${state.query}\"",
                        )
                }
            }
        }
    }
}

private const val LOAD_MORE_BUFFER = 3
