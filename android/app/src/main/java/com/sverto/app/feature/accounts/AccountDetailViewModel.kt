package com.sverto.app.feature.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AccountDetailObserver
import uniffi.sverto_core.AccountDetailState
import uniffi.sverto_core.AppStore

class AccountDetailViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state =
        MutableStateFlow(
            AccountDetailState(
                isLoading = true,
                error = null,
                accountId = "",
                accountName = "",
                accountTypeId = 0,
                chartData = emptyList(),
                holdings = emptyList(),
                cashBalance = 0.0,
                totalValue = 0.0,
                totalCostBasis = 0.0,
                unrealizedGains = 0.0,
                realizedGains = 0.0,
                totalFees = 0.0,
                recentTransactions = emptyList(),
            ),
        )
    val state: StateFlow<AccountDetailState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val observer =
        object : AccountDetailObserver {
            override fun onAccountDetailChanged(state: AccountDetailState) {
                val wasRefreshing = _isRefreshing.value
                _state.value = state
                if (wasRefreshing && !state.isLoading) {
                    _isRefreshing.value = false
                }
            }
        }

    init {
        store.observeAccountDetail(observer)
    }

    fun load(
        accountId: String,
        accountName: String,
        accountTypeId: Int,
    ) {
        viewModelScope.launch { store.loadAccountDetail(accountId, accountName, accountTypeId) }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch { store.refreshAccountDetail() }
    }

    override fun onCleared() {
        store.unobserveAccountDetail()
    }
}
