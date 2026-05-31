package com.sverto.app.feature.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import uniffi.sverto_core.AppStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AssetDetailObserver
import uniffi.sverto_core.AssetDetailState

class AssetDetailViewModel(private val store: AppStore) : ViewModel() {
    private val _state = MutableStateFlow(
        AssetDetailState(
            isLoading = true,
            error = null,
            assetId = 0,
            ticker = "",
            name = "",
            units = 0.0,
            value = 0.0,
            costBasis = 0.0,
            unrealizedGains = 0.0,
            totalFees = 0.0,
            currentPrice = 0.0,
            chartData = emptyList(),
            lots = emptyList()
        )
    )
    val state: StateFlow<AssetDetailState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val observer = object : AssetDetailObserver {
        override fun onAssetDetailChanged(state: AssetDetailState) {
            val wasRefreshing = _isRefreshing.value
            _state.value = state
            if (wasRefreshing && !state.isLoading) {
                _isRefreshing.value = false
            }
        }
    }

    init {
        store.observeAssetDetail(observer)
    }

    fun load(accountId: String, assetId: Int) {
        viewModelScope.launch { store.loadAssetDetail(accountId, assetId) }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch { store.refreshAssetDetail() }
    }

    override fun onCleared() {
        store.unobserveAssetDetail()
    }
}
