package com.sverto.app.feature.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import uniffi.sverto_core.AppStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AccountTransactionsObserver
import uniffi.sverto_core.AccountTransactionsState

class AccountTransactionsViewModel(private val store: AppStore) : ViewModel() {
    private val _state = MutableStateFlow(
        AccountTransactionsState(
            isLoading = true,
            isLoadingMore = false,
            error = null,
            items = emptyList(),
            hasMore = false
        )
    )
    val state: StateFlow<AccountTransactionsState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val observer = object : AccountTransactionsObserver {
        override fun onAccountTransactionsChanged(state: AccountTransactionsState) {
            val wasRefreshing = _isRefreshing.value
            _state.value = state
            if (wasRefreshing && !state.isLoading) {
                _isRefreshing.value = false
            }
        }
    }

    init {
        store.observeAccountTransactions(observer)
    }

    fun load(accountId: String) {
        viewModelScope.launch { store.loadAccountTransactions(accountId) }
    }

    fun loadMore() {
        viewModelScope.launch { store.loadMoreAccountTransactions() }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch { store.refreshAccountTransactions() }
    }

    override fun onCleared() {
        store.unobserveAccountTransactions()
    }
}
