package com.sverto.app.feature.accounts

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sverto.app.feature.accounts.components.LotCard
import com.sverto.app.feature.accounts.components.MetricItem
import com.sverto.app.feature.accounts.components.MetricsGrid
import com.sverto.app.feature.accounts.components.formatCurrency
import com.sverto.app.feature.portfolio.PortfolioChart
import com.sverto.app.feature.portfolio.TimePeriod
import java.text.NumberFormat

@Suppress("LongMethod")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AssetDetailScreen(
    holdingId: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val holding = remember { MockData.holdings.find { it.id == holdingId } }

    if (holding == null) {
        onBack()
        return
    }

    val chartData =
        remember {
            val raw = MockData.generatePriceChartData(holding.currentPrice)
            raw
                .mapNotNull { (key, points) ->
                    val period = TimePeriod.entries.find { it.apiRange == key }
                    period?.let { it to points }
                }.toMap()
        }

    val unitsFormatted =
        remember {
            val nf = NumberFormat.getNumberInstance()
            nf.minimumFractionDigits = 0
            nf.maximumFractionDigits = 3
            nf.format(holding.units)
        }

    val pnlColor = if (holding.unrealizedPnl >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(holding.ticker)
                        Text(
                            text = holding.name,
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
            AnimatedVisibility(
                visible = contentVisible,
                enter =
                    fadeIn(motionScheme.defaultEffectsSpec()) +
                        slideInVertically(motionScheme.defaultSpatialSpec()) { it / 4 },
            ) {
                PortfolioChart(portfolioData = chartData)
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
                                MetricItem(label = "Total Value", value = formatCurrency(holding.currentValue)),
                                MetricItem(label = "Cost Basis", value = formatCurrency(holding.costBasis)),
                                MetricItem(
                                    label = "Unrealized P&L",
                                    value = formatCurrency(holding.unrealizedPnl),
                                    valueColor = pnlColor,
                                ),
                                MetricItem(label = "Units Held", value = unitsFormatted),
                            ),
                    )
                }
            }

            // Positions (lots) (staggered animation)
            if (holding.lots.isNotEmpty()) {
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
                            text = "Positions (${holding.lots.size} lots)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )

                        holding.lots.forEach { lot ->
                            LotCard(lot = lot)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}
