package com.sverto.app.feature.accounts

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.ui.RowDivider
import com.sverto.app.feature.accounts.components.HoldingRow
import com.sverto.app.feature.accounts.components.MetricItem
import com.sverto.app.feature.accounts.components.MetricsGrid
import com.sverto.app.feature.accounts.components.formatCurrency
import com.sverto.app.feature.portfolio.ChartPoint
import com.sverto.app.feature.portfolio.PortfolioChart
import com.sverto.app.feature.portfolio.TimePeriod
import com.sverto.app.feature.transactions.TransactionAmount
import com.sverto.app.feature.transactions.TransactionGlyph
import uniffi.sverto_core.TransactionListItem

@Suppress("LongMethod")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AccountDetailScreen(
    accountId: String,
    accountName: String,
    accountTypeId: Int,
    onBack: () -> Unit,
    onHoldingClick: (String, Int) -> Unit,
    onViewAllTransactions: () -> Unit,
    onTransactionClick: (TransactionListItem) -> Unit,
    onEdit: (String) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
    viewModel: AccountDetailViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(accountId) {
        viewModel.load(accountId, accountName, accountTypeId)
    }

    val isBrokerage = accountTypeId == 3 // Investment account

    var menuOpen by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    // Convert chart data from UniFFI to portfolio ChartPoint
    val chartData: Map<TimePeriod, List<ChartPoint>> =
        state.chartData.associate { periodData ->
            val period =
                TimePeriod.entries.find { it.apiRange == periodData.period.lowercase() }
                    ?: return@associate TimePeriod.MONTH to emptyList()
            val points = periodData.points.map { ChartPoint(date = it.timestamp, value = it.value) }
            period to points
        }

    val holdings = state.holdings
    val transactions = state.recentTransactions

    val listState = rememberLazyListState()
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier = modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text(accountName) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { menuOpen = !menuOpen }) {
                        Icon(
                            imageVector = Icons.Filled.MoreVert,
                            contentDescription = "More options",
                        )
                    }
                    DropdownMenu(
                        expanded = menuOpen,
                        onDismissRequest = { menuOpen = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text("Edit") },
                            onClick = {
                                menuOpen = false
                                onEdit(accountId)
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                            onClick = {
                                menuOpen = false
                                showDeleteConfirm = true
                            },
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
                            if (chartData.isNotEmpty()) {
                                Column(modifier = Modifier.animateItem()) {
                                    PortfolioChart(portfolioData = chartData)
                                    Spacer(modifier = Modifier.height(24.dp))
                                }
                            }
                        }

                        if (isBrokerage) {
                            item(key = "investment_summary") {
                                Column(modifier = Modifier.animateItem()) {
                                    Text(
                                        text = "Investment Summary",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))

                                    val pnlColor =
                                        if (state.unrealizedGains >= 0) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            MaterialTheme.colorScheme.error
                                        }
                                    MetricsGrid(
                                        items =
                                            listOf(
                                                MetricItem(label = "Total Value", value = formatCurrency(state.totalValue)),
                                                MetricItem(label = "Cost Basis", value = formatCurrency(state.totalCostBasis)),
                                                MetricItem(
                                                    label = "Unrealized P&L",
                                                    value = formatCurrency(state.unrealizedGains),
                                                    valueColor = pnlColor,
                                                ),
                                                MetricItem(label = "Total Fees", value = formatCurrency(state.totalFees)),
                                            ),
                                    )
                                    Spacer(modifier = Modifier.height(24.dp))
                                }
                            }

                            item(key = "holdings") {
                                Column(modifier = Modifier.animateItem()) {
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
                                        shape = RoundedCornerShape(20.dp),
                                        color = MaterialTheme.colorScheme.surfaceBright,
                                    ) {
                                        Column {
                                            holdings.forEachIndexed { index, holding ->
                                                HoldingRow(
                                                    holding = holding,
                                                    onClick = { onHoldingClick(accountId, holding.assetId) },
                                                )
                                                if (index < holdings.size - 1) {
                                                    RowDivider()
                                                }
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(24.dp))
                                }
                            }
                        }

                        item(key = "transactions") {
                            Column(modifier = Modifier.animateItem()) {
                                Text(
                                    text = "Transactions",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Spacer(modifier = Modifier.height(8.dp))

                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = MaterialTheme.colorScheme.surfaceBright,
                                ) {
                                    Column {
                                        transactions.forEachIndexed { index, tx ->
                                            val subtitle = tx.categoryName.ifEmpty { tx.typeLabel }
                                            ListItem(
                                                modifier =
                                                    Modifier
                                                        .sharedBounds(
                                                            sharedContentState = rememberSharedContentState(key = "tx_${tx.id}"),
                                                            animatedVisibilityScope = animatedVisibilityScope,
                                                        ).clickable { onTransactionClick(tx) },
                                                leadingContent = {
                                                    TransactionGlyph(
                                                        transaction = tx,
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
                                                    TransactionAmount(transaction = tx)
                                                },
                                                colors =
                                                    ListItemDefaults.colors(
                                                        containerColor = MaterialTheme.colorScheme.surfaceBright,
                                                    ),
                                            )
                                            if (index < transactions.size - 1) {
                                                RowDivider()
                                            }
                                        }
                                        RowDivider()
                                        TextButton(
                                            onClick = onViewAllTransactions,
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Text("View more transactions")
                                        }
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

        if (showDeleteConfirm) {
            AlertDialog(
                onDismissRequest = { showDeleteConfirm = false },
                title = { Text("Delete account") },
                text = { Text("Are you sure you want to delete this account? This action cannot be undone.") },
                confirmButton = {
                    TextButton(onClick = {
                        viewModel.delete(accountId) {
                            showDeleteConfirm = false
                            onBack()
                        }
                    }) {
                        Text("Delete", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteConfirm = false }) {
                        Text("Cancel")
                    }
                },
            )
        }
    }
}
