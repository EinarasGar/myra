package com.sverto.app.feature.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AccountsObserver
import uniffi.sverto_core.AccountsState
import uniffi.sverto_core.AppStore

class AccountsViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state =
        MutableStateFlow(
            AccountsState(
                isLoading = true,
                isLoadingBalances = false,
                error = null,
                accounts = emptyList(),
            ),
        )
    val state: StateFlow<AccountsState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val observer =
        object : AccountsObserver {
            override fun onAccountsChanged(state: AccountsState) {
                val wasRefreshing = _isRefreshing.value
                _state.value = state
                if (wasRefreshing && !state.isLoading && !state.isLoadingBalances) {
                    _isRefreshing.value = false
                }
            }
        }

    init {
        store.observeAccounts(observer)
        load()
    }

    fun load() {
        viewModelScope.launch { store.loadAccounts() }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch { store.refreshAccounts() }
    }

    override fun onCleared() {
        store.unobserveAccounts()
    }
}
