package com.sverto.app.feature.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.TransactionVisibility
import uniffi.sverto_core.TransactionsObserver
import uniffi.sverto_core.TransactionsState

class TransactionsViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state =
        MutableStateFlow(
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

    private val _selectedIds = MutableStateFlow<Set<String>>(emptySet())
    val selectedIds: StateFlow<Set<String>> = _selectedIds.asStateFlow()

    private val _isBulkBusy = MutableStateFlow(false)
    val isBulkBusy: StateFlow<Boolean> = _isBulkBusy.asStateFlow()

    private val observer =
        object : TransactionsObserver {
            override fun onTransactionsChanged(state: TransactionsState) {
                val wasRefreshing = _isRefreshing.value
                _state.value = state
                if (_selectedIds.value.isNotEmpty() && !state.isLoading) {
                    val existing = state.items.mapTo(mutableSetOf()) { it.id }
                    _selectedIds.value = _selectedIds.value intersect existing
                }
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

    fun deleteTransaction(
        transactionId: String,
        onSuccess: () -> Unit,
    ) {
        viewModelScope.launch {
            try {
                store.deleteTransaction(transactionId)
                onSuccess()
            } catch (_: Exception) {
            }
        }
    }

    fun deleteTransactionGroup(
        groupId: String,
        onSuccess: () -> Unit,
    ) {
        viewModelScope.launch {
            try {
                store.deleteTransactionGroup(groupId)
                onSuccess()
            } catch (_: Exception) {
            }
        }
    }

    fun markReviewed(
        txId: String,
        onDone: () -> Unit = {},
    ) {
        viewModelScope.launch {
            try {
                store.setTransactionVisibility(txId, TransactionVisibility.DEFAULT)
                refresh()
                onDone()
            } catch (_: Exception) {
            }
        }
    }

    fun toggleSelection(transactionId: String) {
        _selectedIds.value =
            _selectedIds.value.toMutableSet().apply {
                if (!add(transactionId)) remove(transactionId)
            }
    }

    fun clearSelection() {
        _selectedIds.value = emptySet()
    }

    fun markSelectedReviewed() {
        if (_isBulkBusy.value) return
        val selected = _selectedIds.value
        val txIds =
            state.value.items
                .filter { it.id in selected }
                .flatMap { item ->
                    if (item.isGroup) item.children.map { it.id } else listOf(item.id)
                }
        if (txIds.isEmpty()) return
        viewModelScope.launch {
            _isBulkBusy.value = true
            try {
                store.setTransactionsVisibility(txIds, TransactionVisibility.DEFAULT)
                _selectedIds.value = emptySet()
                refresh()
            } catch (_: Exception) {
            } finally {
                _isBulkBusy.value = false
            }
        }
    }

    fun deleteSelected() {
        if (_isBulkBusy.value) return
        val selected = _selectedIds.value
        val items = state.value.items.filter { it.id in selected }
        if (items.isEmpty()) return
        val groupIds = items.filter { it.isGroup }.map { it.id }
        val transactionIds = items.filterNot { it.isGroup }.map { it.id }
        viewModelScope.launch {
            _isBulkBusy.value = true
            try {
                store.deleteTransactions(transactionIds, groupIds)
                _selectedIds.value = emptySet()
            } catch (
                @Suppress("TooGenericExceptionCaught") _: Exception,
            ) {
            } finally {
                _isBulkBusy.value = false
            }
        }
    }

    override fun onCleared() {
        store.unobserveTransactions()
    }
}
