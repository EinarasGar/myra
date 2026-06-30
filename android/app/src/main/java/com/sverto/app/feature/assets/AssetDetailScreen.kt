package com.sverto.app.feature.assets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.ui.PortfolioChartSkeleton
import com.sverto.app.feature.assets.components.AddRateSheet
import com.sverto.app.feature.assets.components.AssetPickerSheet
import com.sverto.app.feature.assets.components.PairPickerSheet
import com.sverto.app.feature.portfolio.PortfolioChart

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AssetDetailScreen(
    assetId: Int,
    userAsset: Boolean,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AssetDetailViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(assetId, userAsset) { viewModel.load(assetId, userAsset) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(Unit) {
        viewModel.errors.collect { message ->
            snackbarHostState.currentSnackbarData?.dismiss()
            snackbarHostState.showSnackbar(message, duration = SnackbarDuration.Long)
        }
    }

    var menuOpen by remember { mutableStateOf(false) }
    var showPairPicker by remember { mutableStateOf(false) }
    var showAddRate by remember { mutableStateOf(false) }
    var showAddPair by remember { mutableStateOf(false) }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    Scaffold(
        modifier = modifier.fillMaxSize().nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text(state.detail?.displaySymbol ?: "") },
                subtitle = {
                    val d = state.detail
                    if (d != null) {
                        Text(
                            listOfNotNull(d.name, d.exchange, d.assetType).joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (userAsset) {
                        IconButton(onClick = { menuOpen = true }) {
                            Icon(Icons.Filled.MoreVert, contentDescription = "Actions")
                        }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(
                                text = { Text("Add rate") },
                                onClick = {
                                    menuOpen = false
                                    showAddRate = true
                                },
                            )
                            DropdownMenuItem(
                                text = { Text("Add pair") },
                                onClick = {
                                    menuOpen = false
                                    showAddPair = true
                                },
                            )
                            DropdownMenuItem(
                                text = { Text("Delete asset") },
                                onClick = {
                                    menuOpen = false
                                    viewModel.delete(onBack)
                                },
                            )
                        }
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
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
        ) {
            item {
                val ratesLoading =
                    state.selectedPairId != null &&
                        !state.chartByPeriod.containsKey(state.selectedPeriod)
                if (state.isLoading || ratesLoading) {
                    PortfolioChartSkeleton(modifier = Modifier.padding(vertical = 16.dp))
                } else {
                    val quoteTicker =
                        state.detail
                            ?.pairs
                            ?.firstOrNull { it.assetId == state.selectedPairId }
                            ?.ticker ?: ""
                    PortfolioChart(
                        portfolioData = state.chartByPeriod,
                        currencyTicker = quoteTicker,
                        selectedPeriod = state.selectedPeriod,
                        onPeriodSelect = viewModel::selectPeriod,
                        headerTrailing = {
                            val detail = state.detail
                            val pairs = detail?.pairs ?: emptyList()
                            val selected = pairs.firstOrNull { it.assetId == state.selectedPairId }
                            if (detail != null && selected != null) {
                                PairAnchor(
                                    label = "${detail.displaySymbol}/${selected.ticker}",
                                    switchable = pairs.size > 1,
                                    onClick = { showPairPicker = true },
                                )
                            }
                        },
                        modifier = Modifier.padding(vertical = 16.dp),
                    )
                }
            }

            item {
                val info = state.pairInfo
                val hasMetadata =
                    info != null &&
                        (
                            info.latestRate != null ||
                                info.volume != null ||
                                info.lastUpdated != null ||
                                info.exchange != null
                        )
                if (info != null && hasMetadata) {
                    AssetInfoCard(info)
                }
            }
        }
    }

    if (showAddRate) {
        AddRateSheet(
            onSubmit = { date, rate ->
                viewModel.addRate(date, rate)
                showAddRate = false
            },
            onDismiss = { showAddRate = false },
        )
    }
    if (showAddPair) {
        AssetPickerSheet(
            title = "Add pair",
            onSelect = { asset ->
                viewModel.addPair(asset.id)
                showAddPair = false
            },
            onDismiss = { showAddPair = false },
        )
    }
    if (showPairPicker) {
        PairPickerSheet(
            pairs = viewModel.pairs(),
            selectedPairId = state.selectedPairId,
            onSelect = { pair ->
                viewModel.selectPair(pair.assetId)
                showPairPicker = false
            },
            onDismiss = { showPairPicker = false },
        )
    }
}

@Composable
fun AssetInfoCard(info: uniffi.sverto_core.AssetPairDetail) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceBright,
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            info.latestRate?.let { InfoLine("Latest rate", formatRate(it)) }
            info.volume?.let { InfoLine("Volume", formatRate(it)) }
            info.lastUpdated?.let { InfoLine("Updated", formatUnixDate(it)) }
            info.exchange?.let { InfoLine("Exchange", it) }
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun PairAnchor(
    label: String,
    switchable: Boolean,
    onClick: () -> Unit,
) {
    if (switchable) {
        FilledTonalButton(
            onClick = onClick,
            shapes = ButtonDefaults.shapes(),
            contentPadding = PaddingValues(start = 16.dp, top = 8.dp, end = 12.dp, bottom = 8.dp),
        ) {
            Text(label, maxLines = 1)
            Spacer(Modifier.size(ButtonDefaults.IconSpacing))
            Icon(
                Icons.Filled.ArrowDropDown,
                contentDescription = "Change pair",
                modifier = Modifier.size(ButtonDefaults.IconSize),
            )
        }
    } else {
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
        )
    }
}

@Composable
private fun InfoLine(
    label: String,
    value: String,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleSmall)
    }
}
