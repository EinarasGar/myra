package com.sverto.app.feature.assets

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.input.clearText
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExpandedFullScreenSearchBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSearchBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
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
import com.sverto.app.feature.assets.components.AssetListRow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AssetSummary

/**
 * The Portfolio app bar's title: a Material 3 search-container pill (Sverto logo + "Search Sverto")
 * that lives where the "Sverto" title sits on other tabs, so the leading/avatar app-bar elements
 * never move. Tapping it expands (M3E motion) into the native full-screen asset search.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssetSearchAppBar(
    onAssetClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MarketsListViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val searchBarState = rememberSearchBarState()
    val textFieldState = rememberTextFieldState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        snapshotFlow { textFieldState.text.toString() }
            .collect { viewModel.onQueryChange(it) }
    }

    Surface(
        onClick = {
            viewModel.onSearchExpanded()
            scope.launch { searchBarState.animateToExpanded() }
        },
        shape = RoundedCornerShape(percent = 50),
        color = MaterialTheme.colorScheme.surfaceBright,
        modifier = modifier.fillMaxWidth().height(48.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                "Search Sverto",
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
            placeholder = { Text("Search assets") },
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
        SearchResults(
            state = state,
            onLoadMore = viewModel::loadMore,
            onAssetClick = { id ->
                scope.launch { searchBarState.animateToCollapsed() }
                onAssetClick(id)
            },
        )
    }
}

@Composable
private fun SearchResults(
    state: MarketsState,
    onLoadMore: () -> Unit,
    onAssetClick: (Int) -> Unit,
) {
    val listState = rememberLazyListState()
    val currentOnLoadMore by rememberUpdatedState(onLoadMore)
    val shouldLoadMore by remember {
        derivedStateOf {
            val last =
                listState.layoutInfo.visibleItemsInfo
                    .lastOrNull()
                    ?.index ?: 0
            last >= state.items.size - 5
        }
    }
    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) currentOnLoadMore()
    }

    LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
        items(state.items, key = { it.id }) { asset ->
            AssetRow(asset = asset, onClick = { onAssetClick(asset.id) })
        }
        if (state.isLoading || state.isLoadingMore) {
            item {
                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }
        if (!state.isLoading && state.items.isEmpty()) {
            item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text(
                        text = if (state.query.isBlank()) "No assets" else "No results",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
internal fun AssetRow(
    asset: AssetSummary,
    onClick: () -> Unit,
) {
    AssetListRow(
        ticker = asset.ticker,
        name = asset.name,
        supportingText =
            if (asset.assetType.isBlank()) asset.name else "${asset.name} · ${asset.assetType}",
        onClick = onClick,
    )
}
