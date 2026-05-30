package com.sverto.app.feature.accounts

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CallMade
import androidx.compose.material.icons.outlined.CallReceived
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.SwapHoriz
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
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sverto.app.feature.accounts.components.HoldingRow
import com.sverto.app.feature.accounts.components.MetricItem
import com.sverto.app.feature.accounts.components.MetricsGrid
import com.sverto.app.feature.accounts.components.formatCurrency
import com.sverto.app.feature.portfolio.PortfolioChart
import com.sverto.app.feature.portfolio.TimePeriod
import uniffi.sverto_core.TransactionListItem

@Suppress("LongMethod")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AccountDetailScreen(
    accountId: String,
    onBack: () -> Unit,
    onHoldingClick: (String) -> Unit,
    onViewAllTransactions: () -> Unit,
    onTransactionClick: (TransactionListItem) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
) {
    val account = remember(accountId) { MockData.accounts.find { it.id == accountId } }

    if (account == null) {
        onBack()
        return
    }

    val isBrokerage = account.type == AccountType.BROKERAGE

    val chartData =
        remember {
            val raw = MockData.generateChartData()
            raw
                .mapNotNull { (key, points) ->
                    val period = TimePeriod.entries.find { it.apiRange == key }
                    period?.let { it to points }
                }.toMap()
        }

    val holdings = remember { MockData.holdings }

    val transactions =
        remember(accountId) {
            MockData.transactionsForAccount(accountId).take(5)
        }

    val totalValue = remember { holdings.sumOf { it.currentValue } }
    val costBasis = remember { holdings.sumOf { it.costBasis } }
    val unrealizedPnl = remember { holdings.sumOf { it.unrealizedPnl } }
    val totalFees = remember { holdings.sumOf { it.totalFees } }

    val listState = rememberLazyListState()

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = { Text(account.name) },
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
        with(sharedTransitionScope) {
            LazyColumn(
                state = listState,
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
            ) {
                item(key = "chart") {
                    PortfolioChart(portfolioData = chartData)
                    Spacer(modifier = Modifier.height(24.dp))
                }

                if (isBrokerage) {
                    item(key = "investment_summary") {
                        Text(
                            text = "Investment Summary",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        val pnlColor =
                            if (unrealizedPnl >= 0) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.error
                            }
                        MetricsGrid(
                            items =
                                listOf(
                                    MetricItem(label = "Total Value", value = formatCurrency(totalValue)),
                                    MetricItem(label = "Cost Basis", value = formatCurrency(costBasis)),
                                    MetricItem(
                                        label = "Unrealized P&L",
                                        value = formatCurrency(unrealizedPnl),
                                        valueColor = pnlColor,
                                    ),
                                    MetricItem(label = "Total Fees", value = formatCurrency(totalFees)),
                                ),
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                    }

                    item(key = "holdings") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Holdings",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = "${holdings.size} assets",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))

                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerHigh,
                        ) {
                            Column {
                                holdings.forEachIndexed { index, holding ->
                                    HoldingRow(
                                        holding = holding,
                                        onClick = { onHoldingClick(holding.id) },
                                    )
                                    if (index < holdings.size - 1) {
                                        HorizontalDivider(
                                            modifier = Modifier.padding(horizontal = 16.dp),
                                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }

                item(key = "transactions") {
                    Text(
                        text = "Transactions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    ) {
                        Column {
                            transactions.forEachIndexed { index, tx ->
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
                                if (index < transactions.size - 1) {
                                    HorizontalDivider(
                                        modifier = Modifier.padding(horizontal = 16.dp),
                                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                                    )
                                }
                            }
                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 16.dp),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                            )
                            TextButton(
                                onClick = onViewAllTransactions,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("View more transactions")
                            }
                        }
                    }
                }

                item(key = "bottom_spacer") {
                    Spacer(modifier = Modifier.height(24.dp))
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
