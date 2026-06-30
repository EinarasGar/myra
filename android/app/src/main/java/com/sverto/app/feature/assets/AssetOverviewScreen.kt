@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package com.sverto.app.feature.assets

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
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
import com.sverto.app.core.Money
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.ui.PortfolioChartSkeleton
import com.sverto.app.feature.accounts.components.LotCard
import com.sverto.app.feature.accounts.components.MetricItem
import com.sverto.app.feature.accounts.components.MetricsGrid
import com.sverto.app.feature.assets.components.AddRateSheet
import com.sverto.app.feature.assets.components.AssetPickerSheet
import com.sverto.app.feature.assets.components.PairPickerSheet
import com.sverto.app.feature.portfolio.PortfolioChart
import kotlinx.coroutines.delay
import uniffi.sverto_core.AssetOverviewState
import uniffi.sverto_core.AssetPairDetail
import java.text.NumberFormat

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AssetOverviewScreen(
    assetId: Int,
    userAsset: Boolean,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AssetOverviewViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(assetId, userAsset) {
        viewModel.load(assetId, userAsset)
    }

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
            AssetOverviewTopBar(
                state = state,
                userAsset = userAsset,
                menuOpen = menuOpen,
                onMenuOpenChange = { menuOpen = it },
                onAddRate = { showAddRate = true },
                onAddPair = { showAddPair = true },
                onDelete = { viewModel.delete(onBack) },
                onBack = onBack,
                scrollBehavior = scrollBehavior,
            )
        },
    ) { padding ->
        AssetOverviewContent(
            state = state,
            viewModel = viewModel,
            padding = padding,
            onPairPickerOpen = { showPairPicker = true },
        )
    }

    AssetOverviewSheets(
        showAddRate = showAddRate,
        showAddPair = showAddPair,
        showPairPicker = showPairPicker,
        state = state,
        viewModel = viewModel,
        onAddRateDismiss = { showAddRate = false },
        onAddPairDismiss = { showAddPair = false },
        onPairPickerDismiss = { showPairPicker = false },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AssetOverviewTopBar(
    state: AssetOverviewUiState,
    userAsset: Boolean,
    menuOpen: Boolean,
    onMenuOpenChange: (Boolean) -> Unit,
    onAddRate: () -> Unit,
    onAddPair: () -> Unit,
    onDelete: () -> Unit,
    onBack: () -> Unit,
    scrollBehavior: TopAppBarScrollBehavior,
) {
    MediumFlexibleTopAppBar(
        title = { Text(state.detail?.displaySymbol ?: state.overview?.ticker ?: "") },
        subtitle = {
            Text(
                text = state.detail?.name ?: state.overview?.name ?: "",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        navigationIcon = {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                )
            }
        },
        actions = {
            if (userAsset) {
                AssetOverviewActions(
                    menuOpen = menuOpen,
                    onMenuOpenChange = onMenuOpenChange,
                    onAddRate = onAddRate,
                    onAddPair = onAddPair,
                    onDelete = onDelete,
                )
            }
        },
        colors =
            TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
                scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
            ),
        scrollBehavior = scrollBehavior,
    )
}

@Composable
private fun AssetOverviewActions(
    menuOpen: Boolean,
    onMenuOpenChange: (Boolean) -> Unit,
    onAddRate: () -> Unit,
    onAddPair: () -> Unit,
    onDelete: () -> Unit,
) {
    IconButton(onClick = { onMenuOpenChange(true) }) {
        Icon(Icons.Filled.MoreVert, contentDescription = "Actions")
    }
    DropdownMenu(
        expanded = menuOpen,
        onDismissRequest = { onMenuOpenChange(false) },
    ) {
        DropdownMenuItem(
            text = { Text("Add rate") },
            onClick = {
                onMenuOpenChange(false)
                onAddRate()
            },
        )
        DropdownMenuItem(
            text = { Text("Add pair") },
            onClick = {
                onMenuOpenChange(false)
                onAddPair()
            },
        )
        DropdownMenuItem(
            text = { Text("Delete asset") },
            onClick = {
                onMenuOpenChange(false)
                onDelete()
            },
        )
    }
}

@Composable
private fun AssetOverviewContent(
    state: AssetOverviewUiState,
    viewModel: AssetOverviewViewModel,
    padding: PaddingValues,
    onPairPickerOpen: () -> Unit,
) {
    when {
        state.isLoading -> LoadingContent(padding)
        state.overview?.error != null -> ErrorContent(state.overview.error, padding)
        else ->
            LoadedContent(
                state = state,
                viewModel = viewModel,
                padding = padding,
                onPairPickerOpen = onPairPickerOpen,
            )
    }
}

@Composable
private fun LoadingContent(padding: PaddingValues) {
    Box(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(padding),
        contentAlignment = Alignment.Center,
    ) {
        LoadingIndicator()
    }
}

@Composable
private fun ErrorContent(
    error: String?,
    padding: PaddingValues,
) {
    Box(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(padding),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "Error: $error",
            color = MaterialTheme.colorScheme.error,
        )
    }
}

@Composable
private fun LoadedContent(
    state: AssetOverviewUiState,
    viewModel: AssetOverviewViewModel,
    padding: PaddingValues,
    onPairPickerOpen: () -> Unit,
) {
    var chartVisible by remember { mutableStateOf(false) }
    var positionVisible by remember { mutableStateOf(false) }
    var lotsVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        chartVisible = true
        delay(STAGGER_STEP_MS)
        positionVisible = true
        delay(STAGGER_STEP_MS)
        lotsVisible = true
    }

    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        val referenceTicker =
            state.detail
                ?.pairs
                ?.firstOrNull { it.assetId == state.selectedPairId }
                ?.ticker
                ?: state.overview?.priceTicker ?: ""
        AssetChartSection(
            state = state,
            viewModel = viewModel,
            referenceTicker = referenceTicker,
            onPairPickerOpen = onPairPickerOpen,
        )
        AssetPairMetadata(state.pairInfo)
        AssetPositionSections(
            overview = state.overview,
            referenceTicker = referenceTicker,
            positionVisible = positionVisible,
            lotsVisible = lotsVisible,
            isReloading = state.isReloading,
        )
        Spacer(modifier = Modifier.height(8.dp))
    }
}

@Composable
private fun AssetChartSection(
    state: AssetOverviewUiState,
    viewModel: AssetOverviewViewModel,
    referenceTicker: String,
    onPairPickerOpen: () -> Unit,
) {
    val ratesLoading = state.selectedPairId != null && !state.chartByPeriod.containsKey(state.selectedPeriod)
    if (state.isLoading || ratesLoading) {
        PortfolioChartSkeleton(modifier = Modifier.padding(vertical = 16.dp))
        return
    }

    PortfolioChart(
        portfolioData = state.chartByPeriod,
        currencyTicker = referenceTicker,
        selectedPeriod = state.selectedPeriod,
        onPeriodSelect = viewModel::selectPeriod,
        headerTrailing = {
            PairAnchorHeader(
                state = state,
                onPairPickerOpen = onPairPickerOpen,
            )
        },
        modifier = Modifier.padding(vertical = 16.dp),
    )
}

@Composable
private fun PairAnchorHeader(
    state: AssetOverviewUiState,
    onPairPickerOpen: () -> Unit,
) {
    val detail = state.detail ?: return
    val pairs = detail.pairs
    val selected = pairs.firstOrNull { it.assetId == state.selectedPairId } ?: return
    PairAnchor(
        label = "${detail.displaySymbol}/${selected.ticker}",
        switchable = pairs.size > 1,
        onClick = onPairPickerOpen,
    )
}

@Composable
private fun AssetPairMetadata(info: AssetPairDetail?) {
    if (info != null && hasMetadata(info)) {
        AssetInfoCard(info)
    }
}

private fun hasMetadata(info: AssetPairDetail): Boolean =
    info.latestRate != null || info.volume != null || info.lastUpdated != null || info.exchange != null

@Composable
private fun AssetPositionSections(
    overview: AssetOverviewState?,
    referenceTicker: String,
    positionVisible: Boolean,
    lotsVisible: Boolean,
    isReloading: Boolean,
) {
    if (overview == null) return
    val heldOverview =
        overview.takeIf { it.lots.isNotEmpty() }
            ?: run {
                NotHeldHint(visible = positionVisible)
                return
            }
    Box(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PositionSummary(
                overview = heldOverview,
                referenceTicker = referenceTicker,
                visible = positionVisible,
            )
            PositionsList(
                overview = heldOverview,
                referenceTicker = referenceTicker,
                visible = lotsVisible,
            )
        }
        if (isReloading) {
            ReloadingOverlay()
        }
    }
}

@Composable
private fun NotHeldHint(visible: Boolean) {
    val motionScheme = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible = visible,
        enter =
            fadeIn(motionScheme.fastEffectsSpec()) +
                slideInVertically(motionScheme.fastSpatialSpec()) { it / 4 },
    ) {
        Text(
            text = "You don't hold this asset in any account.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        )
    }
}

@Composable
private fun PositionSummary(
    overview: AssetOverviewState,
    referenceTicker: String,
    visible: Boolean,
) {
    val motionScheme = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible = visible,
        enter =
            fadeIn(motionScheme.fastEffectsSpec()) +
                slideInVertically(motionScheme.fastSpatialSpec()) { it / 4 },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val unitsFormatted = rememberFormattedUnits(overview.units)
            val pnlColor =
                if (overview.unrealizedGains >= 0) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.error
                }

            Text(
                text = "My Position",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = Money.format(overview.value, referenceTicker),
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            MetricsGrid(
                items =
                    listOf(
                        MetricItem(
                            label = "Cost Basis",
                            value = Money.format(overview.costBasis, referenceTicker),
                        ),
                        MetricItem(
                            label = "Unrealized P&L",
                            value = Money.format(overview.unrealizedGains, referenceTicker, signed = true),
                            valueColor = pnlColor,
                        ),
                        MetricItem(
                            label = "Units Held",
                            value = unitsFormatted,
                        ),
                    ),
            )
        }
    }
}

@Composable
private fun rememberFormattedUnits(units: Double): String =
    remember(units) {
        val formatter = NumberFormat.getNumberInstance()
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 3
        formatter.format(units)
    }

@Composable
private fun PositionsList(
    overview: AssetOverviewState,
    referenceTicker: String,
    visible: Boolean,
) {
    val motionScheme = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible = visible,
        enter =
            fadeIn(motionScheme.defaultEffectsSpec()) +
                slideInVertically(motionScheme.defaultSpatialSpec()) { it / 4 },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Positions (${overview.lots.size} lots)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            overview.lots.forEach { lot ->
                LotCard(
                    lot = lot,
                    baseTicker = referenceTicker,
                    showAccount = true,
                )
            }
        }
    }
}

@Composable
private fun ReloadingOverlay() {
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        LoadingIndicator(modifier = Modifier.size(24.dp))
    }
}

@Composable
private fun AssetOverviewSheets(
    showAddRate: Boolean,
    showAddPair: Boolean,
    showPairPicker: Boolean,
    state: AssetOverviewUiState,
    viewModel: AssetOverviewViewModel,
    onAddRateDismiss: () -> Unit,
    onAddPairDismiss: () -> Unit,
    onPairPickerDismiss: () -> Unit,
) {
    if (showAddRate) {
        AddRateSheet(
            onSubmit = { date, rate ->
                viewModel.addRate(date, rate)
                onAddRateDismiss()
            },
            onDismiss = onAddRateDismiss,
        )
    }
    if (showAddPair) {
        AssetPickerSheet(
            title = "Add pair",
            onSelect = { asset ->
                viewModel.addPair(asset.id)
                onAddPairDismiss()
            },
            onDismiss = onAddPairDismiss,
        )
    }
    if (showPairPicker) {
        PairPickerSheet(
            pairs = viewModel.pairs(),
            selectedPairId = state.selectedPairId,
            onSelect = { pair ->
                viewModel.selectPair(pair.assetId)
                onPairPickerDismiss()
            },
            onDismiss = onPairPickerDismiss,
        )
    }
}

private const val STAGGER_STEP_MS = 80L
