package com.sverto.app.feature.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AccountsScreenState(
    val isLoading: Boolean = true,
    val accounts: List<MockAccount> = emptyList(),
    val totalNetWorth: Double = 0.0,
)

class AccountsViewModel : ViewModel() {
    private val _state = MutableStateFlow(AccountsScreenState())
    val state: StateFlow<AccountsScreenState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.value = AccountsScreenState(isLoading = true)
            delay(600)
            _state.value =
                AccountsScreenState(
                    isLoading = false,
                    accounts = MockData.accounts,
                    totalNetWorth = MockData.totalNetWorth,
                )
        }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch {
            delay(400)
            _state.value =
                _state.value.copy(
                    accounts = MockData.accounts,
                    totalNetWorth = MockData.totalNetWorth,
                )
            _isRefreshing.value = false
        }
    }
}
