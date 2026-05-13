package com.sverto.app.feature.portfolio

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.PortfolioObserver
import uniffi.sverto_core.PortfolioState

class HomeViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(
        PortfolioState(
            isLoading = true,
            error = null,
            holdings = emptyList(),
            chartData = emptyList(),
        ),
    )
    val state: StateFlow<PortfolioState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val observer = object : PortfolioObserver {
        override fun onPortfolioChanged(state: PortfolioState) {
            val wasRefreshing = _isRefreshing.value
            _state.value = state
            if (wasRefreshing && !state.isLoading) {
                _isRefreshing.value = false
            }
        }
    }

    init {
        store.observePortfolio(observer)
        load()
    }

    fun load() {
        viewModelScope.launch { store.loadPortfolio() }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch { store.refreshPortfolio() }
    }

    override fun onCleared() {
        store.unobservePortfolio()
    }
}
