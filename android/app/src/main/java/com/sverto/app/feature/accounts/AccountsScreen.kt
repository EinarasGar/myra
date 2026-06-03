package com.sverto.app.feature.accounts

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.ui.shimmerBrush
import com.sverto.app.feature.accounts.components.AccountCard
import com.sverto.app.feature.accounts.components.accountTypeDisplayOrder
import com.sverto.app.feature.accounts.components.accountTypeLabel
import uniffi.sverto_core.AccountListItem
import uniffi.sverto_core.AccountsState

@Suppress("MultipleEmitters")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalSharedTransitionApi::class)
@Composable
fun AccountsScreen(
    onAccountClick: (AccountListItem) -> Unit,
    onAddAccount: () -> Unit,
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
            FilledTonalButton(
                onClick = onAddAccount,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(56.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text("Add account")
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Suppress("MultipleEmitters")
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun AccountsContent(
    state: AccountsState,
    onAccountClick: (AccountListItem) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
) {
    val sections =
        remember(state.accounts) {
            val grouped = state.accounts.groupBy { it.accountTypeId }
            val orderedTypeIds =
                accountTypeDisplayOrder.filter(grouped::containsKey) +
                    grouped.keys.filterNot(accountTypeDisplayOrder::contains)
            orderedTypeIds.map { typeId -> typeId to grouped.getValue(typeId) }
        }

    sections.forEach { (typeId, accounts) ->
        AccountTypeSection(
            label = accountTypeLabel(typeId),
            accounts = accounts,
            onAccountClick = onAccountClick,
            sharedTransitionScope = sharedTransitionScope,
            animatedVisibilityScope = animatedVisibilityScope,
        )
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun AccountTypeSection(
    label: String,
    accounts: List<AccountListItem>,
    onAccountClick: (AccountListItem) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 4.dp),
        )
        accounts.forEach { account ->
            AccountCard(
                account = account,
                onClick = { onAccountClick(account) },
                sharedTransitionScope = sharedTransitionScope,
                animatedVisibilityScope = animatedVisibilityScope,
            )
        }
    }
}

@Composable
private fun AccountsScreenSkeleton() {
    val brush = shimmerBrush()

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        repeat(5) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .background(brush, RoundedCornerShape(28.dp)),
            )
        }
    }
}
