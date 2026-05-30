package com.sverto.app.feature.accounts

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.ui.shimmerBrush
import com.sverto.app.feature.accounts.components.AccountCard
import com.sverto.app.feature.accounts.components.AllocationBar
import com.sverto.app.feature.accounts.components.AllocationLegend
import com.sverto.app.feature.accounts.components.AllocationSegment
import com.sverto.app.feature.accounts.components.accountTypeColor

@Suppress("MultipleEmitters")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalSharedTransitionApi::class)
@Composable
fun AccountsScreen(
    onAccountClick: (String) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
    viewModel: AccountsViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()

    val pullToRefreshState = rememberPullToRefreshState()

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = viewModel::refresh,
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
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp)
                    .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.height(8.dp))

            if (state.isLoading) {
                AccountsScreenSkeleton()
            } else {
                AccountsContent(
                    state = state,
                    onAccountClick = onAccountClick,
                    sharedTransitionScope = sharedTransitionScope,
                    animatedVisibilityScope = animatedVisibilityScope,
                )
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Suppress("MultipleEmitters")
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun AccountsContent(
    state: AccountsScreenState,
    onAccountClick: (String) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
) {
    val segments = buildAllocationSegments(state.accounts, state.totalNetWorth)
    AllocationBar(segments = segments)
    AllocationLegend(segments = segments)

    Spacer(Modifier.height(8.dp))

    state.accounts.forEach { account ->
        AccountCard(
            account = account,
            onClick = { onAccountClick(account.id) },
            sharedTransitionScope = sharedTransitionScope,
            animatedVisibilityScope = animatedVisibilityScope,
        )
    }
}

@Composable
private fun buildAllocationSegments(
    accounts: List<MockAccount>,
    totalNetWorth: Double,
): List<AllocationSegment> {
    if (totalNetWorth <= 0.0) return emptyList()

    val grouped = accounts.groupBy { it.type }
    return grouped.map { (type, accs) ->
        val typeTotal = accs.sumOf { it.balance }
        AllocationSegment(
            label = type.label,
            fraction = (typeTotal / totalNetWorth).toFloat(),
            color = accountTypeColor(type),
        )
    }
}

@Suppress("MultipleEmitters")
@Composable
private fun AccountsScreenSkeleton() {
    val brush = shimmerBrush()

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            Modifier
                .width(100.dp)
                .height(16.dp)
                .background(brush, RoundedCornerShape(4.dp)),
        )
        Spacer(Modifier.height(8.dp))
        Box(
            Modifier
                .width(180.dp)
                .height(32.dp)
                .background(brush, RoundedCornerShape(4.dp)),
        )
    }

    Spacer(Modifier.height(16.dp))

    Box(
        Modifier
            .fillMaxWidth()
            .height(6.dp)
            .background(brush, RoundedCornerShape(3.dp)),
    )

    Spacer(Modifier.height(8.dp))

    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        repeat(3) {
            Box(
                Modifier
                    .width(80.dp)
                    .height(12.dp)
                    .background(brush, RoundedCornerShape(4.dp)),
            )
        }
    }

    Spacer(Modifier.height(16.dp))

    repeat(3) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(72.dp)
                .background(brush, RoundedCornerShape(12.dp)),
        )
        Spacer(Modifier.height(12.dp))
    }
}
