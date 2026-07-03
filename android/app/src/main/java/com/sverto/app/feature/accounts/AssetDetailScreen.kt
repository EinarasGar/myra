package com.sverto.app.feature.accounts

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
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
import com.sverto.app.core.Money
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.feature.accounts.components.LotCard
import com.sverto.app.feature.accounts.components.MetricItem
import com.sverto.app.feature.accounts.components.MetricsGrid
import com.sverto.app.feature.portfolio.ChartPoint
import com.sverto.app.feature.portfolio.PortfolioChart
import com.sverto.app.feature.portfolio.TimePeriod
import kotlinx.coroutines.delay
import java.text.NumberFormat

private const val STAGGER_STEP_MS = 80L

@Suppress("LongMethod")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AssetDetailScreen(
    accountId: String,
    assetId: Int,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AssetDetailViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(accountId, assetId) {
        viewModel.load(accountId, assetId)
    }

    // Convert chart data from UniFFI to portfolio ChartPoint
    val chartData: Map<TimePeriod, List<ChartPoint>> =
        state.chartData.associate { periodData ->
            val period =
                TimePeriod.entries.find { it.apiRange == periodData.period.lowercase() }
                    ?: return@associate TimePeriod.MONTH to emptyList()
            val points = periodData.points.map { ChartPoint(date = it.timestamp, value = it.value) }
            period to points
        }

    val baseChartData: Map<TimePeriod, List<ChartPoint>> =
        state.baseChartData.associate { periodData ->
            val period =
                TimePeriod.entries.find { it.apiRange == periodData.period.lowercase() }
                    ?: return@associate TimePeriod.MONTH to emptyList()
            val points = periodData.points.map { ChartPoint(date = it.timestamp, value = it.value) }
            period to points
        }

    val unitsFormatted =
        remember(state.units) {
            val nf = NumberFormat.getNumberInstance()
            nf.minimumFractionDigits = 0
            nf.maximumFractionDigits = 3
            nf.format(state.units)
        }

    val pnlColor = if (state.unrealizedGains >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier = modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text(state.ticker) },
                subtitle = {
                    Text(
                        text = state.name,
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
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer,
                        scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                    ),
                scrollBehavior = scrollBehavior,
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
                    LoadingIndicator()
                }
            }
            state.error != null -> {
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
                // Each section reveals after an incremental delay so the entrance actually cascades
                // top-to-bottom rather than firing all at once.
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
                val motionScheme = MaterialTheme.motionScheme

                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    // Price chart (staggered animation)
                    if (chartData.isNotEmpty()) {
                        AnimatedVisibility(
                            visible = chartVisible,
                            enter =
                                fadeIn(motionScheme.defaultEffectsSpec()) +
                                    slideInVertically(motionScheme.defaultSpatialSpec()) { it / 4 },
                        ) {
                            var showBase by remember { mutableStateOf(false) }
                            val activeChart = if (showBase) baseChartData else chartData
                            val activeTicker = if (showBase) state.baseTicker else state.priceTicker
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (state.supportsBaseConversion) {
                                    CurrencyToggle(
                                        nativeTicker = state.priceTicker,
                                        baseTicker = state.baseTicker,
                                        showBase = showBase,
                                        onSelect = { base ->
                                            showBase = base
                                            if (base && state.baseChartData.isEmpty()) {
                                                viewModel.loadBaseChart()
                                            }
                                        },
                                    )
                                }
                                PortfolioChart(portfolioData = activeChart, currencyTicker = activeTicker)
                            }
                        }
                    }

                    // My Position (staggered animation with fast specs)
                    AnimatedVisibility(
                        visible = positionVisible,
                        enter =
                            fadeIn(motionScheme.fastEffectsSpec()) +
                                slideInVertically(motionScheme.fastSpatialSpec()) { it / 4 },
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(
                                text = "My Position",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )

                            // Hero total value for the position.
                            Text(
                                text = Money.format(state.value, state.baseTicker),
                                style = MaterialTheme.typography.displaySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )

                            MetricsGrid(
                                items =
                                    listOf(
                                        MetricItem(label = "Cost Basis", value = Money.format(state.costBasis, state.baseTicker)),
                                        MetricItem(
                                            label = "Unrealized P&L",
                                            value = Money.format(state.unrealizedGains, state.baseTicker, signed = true),
                                            valueColor = pnlColor,
                                        ),
                                        MetricItem(label = "Units Held", value = unitsFormatted),
                                    ),
                            )
                        }
                    }

                    // Positions (lots) (staggered animation)
                    if (state.lots.isNotEmpty()) {
                        AnimatedVisibility(
                            visible = lotsVisible,
                            enter =
                                fadeIn(motionScheme.defaultEffectsSpec()) +
                                    slideInVertically(motionScheme.defaultSpatialSpec()) { it / 4 },
                        ) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Text(
                                    text = "Positions (${state.lots.size} lots)",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )

                                state.lots.forEach { lot ->
                                    LotCard(lot = lot, baseTicker = state.baseTicker)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CurrencyToggle(
    nativeTicker: String,
    baseTicker: String,
    showBase: Boolean,
    onSelect: (Boolean) -> Unit,
) {
    SingleChoiceSegmentedButtonRow {
        SegmentedButton(
            selected = !showBase,
            onClick = { onSelect(false) },
            shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
        ) {
            Text(nativeTicker)
        }
        SegmentedButton(
            selected = showBase,
            onClick = { onSelect(true) },
            shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
        ) {
            Text(baseTicker)
        }
    }
}
