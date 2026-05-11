package com.sverto.app.feature.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.TransactionsObserver
import uniffi.sverto_core.TransactionsState

class TransactionsViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(
        TransactionsState(
            isLoading = true,
            isLoadingMore = false,
            error = null,
            items = emptyList(),
            hasMore = false,
        ),
    )
    val state: StateFlow<TransactionsState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val observer = object : TransactionsObserver {
        override fun onTransactionsChanged(state: TransactionsState) {
            val wasRefreshing = _isRefreshing.value
            _state.value = state
            if (wasRefreshing && !state.isLoading) {
                _isRefreshing.value = false
            }
        }
    }

    init {
        store.observeTransactions(observer)
        load()
    }

    fun load() {
        viewModelScope.launch { store.loadTransactions() }
    }

    fun loadMore() {
        viewModelScope.launch { store.loadMoreTransactions() }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch { store.refreshTransactions() }
    }

    fun deleteTransaction(transactionId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                store.deleteTransaction(transactionId)
                onSuccess()
            } catch (_: Exception) {}
        }
    }

    fun deleteTransactionGroup(groupId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                store.deleteTransactionGroup(groupId)
                onSuccess()
            } catch (_: Exception) {}
        }
    }

    override fun onCleared() {
        store.unobserveTransactions()
    }
}
