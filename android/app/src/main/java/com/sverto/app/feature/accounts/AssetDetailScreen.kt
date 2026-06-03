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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.feature.accounts.components.LotCard
import com.sverto.app.feature.accounts.components.MetricItem
import com.sverto.app.feature.accounts.components.MetricsGrid
import com.sverto.app.feature.accounts.components.formatCurrency
import com.sverto.app.feature.portfolio.ChartPoint
import com.sverto.app.feature.portfolio.PortfolioChart
import com.sverto.app.feature.portfolio.TimePeriod
import java.text.NumberFormat

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

    val unitsFormatted =
        remember(state.units) {
            val nf = NumberFormat.getNumberInstance()
            nf.minimumFractionDigits = 0
            nf.maximumFractionDigits = 3
            nf.format(state.units)
        }

    val pnlColor = if (state.unrealizedGains >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(state.ticker)
                        Text(
                            text = state.name,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
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
                var contentVisible by remember { mutableStateOf(false) }
                LaunchedEffect(Unit) { contentVisible = true }
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
                            visible = contentVisible,
                            enter =
                                fadeIn(motionScheme.defaultEffectsSpec()) +
                                    slideInVertically(motionScheme.defaultSpatialSpec()) { it / 4 },
                        ) {
                            PortfolioChart(portfolioData = chartData)
                        }
                    }

                    // My Position (staggered animation with fast specs)
                    AnimatedVisibility(
                        visible = contentVisible,
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

                            MetricsGrid(
                                items =
                                    listOf(
                                        MetricItem(label = "Total Value", value = formatCurrency(state.value)),
                                        MetricItem(label = "Cost Basis", value = formatCurrency(state.costBasis)),
                                        MetricItem(
                                            label = "Unrealized P&L",
                                            value = formatCurrency(state.unrealizedGains),
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
                            visible = contentVisible,
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
                                    LotCard(lot = lot)
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
