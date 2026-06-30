package com.sverto.app.feature.assets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sverto.app.core.friendlyMessage
import com.sverto.app.core.launchCatching
import com.sverto.app.feature.portfolio.ChartPoint
import com.sverto.app.feature.portfolio.TimePeriod
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.AssetDetail
import uniffi.sverto_core.AssetOverviewObserver
import uniffi.sverto_core.AssetOverviewState
import uniffi.sverto_core.AssetPairDetail
import uniffi.sverto_core.AssetPairRef

data class AssetOverviewUiState(
    val isLoading: Boolean = true,
    val overview: AssetOverviewState? = null,
    val detail: AssetDetail? = null,
    val selectedPairId: Int? = null,
    val pairInfo: AssetPairDetail? = null,
    val selectedPeriod: TimePeriod = TimePeriod.MONTH,
    val chartByPeriod: Map<TimePeriod, List<ChartPoint>> = emptyMap(),
    val isUserAsset: Boolean = false,
    val isReloading: Boolean = false,
)

class AssetOverviewViewModel(
    private val store: AppStore,
) : ViewModel(),
    AssetOverviewObserver {
    private val _state = MutableStateFlow(AssetOverviewUiState())
    val state = _state.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors = _errors.asSharedFlow()

    private var assetId: Int = 0

    init {
        store.observeAssetOverview(this)
    }

    override fun onCleared() {
        super.onCleared()
        store.unobserveAssetOverview()
    }

    override fun onAssetOverviewChanged(s: AssetOverviewState) {
        if (s.assetId != 0 && s.assetId != assetId) return
        viewModelScope.launch {
            val wasReloading = _state.value.isReloading
            _state.value =
                _state.value.copy(
                    overview = s,
                    isLoading = false,
                    isReloading = false,
                )
            if (s.error != null) {
                _errors.emit(s.error!!)
            } else if (wasReloading) {
                _state.value = _state.value.copy(isReloading = false)
            }
        }
    }

    fun load(
        assetId: Int,
        userAsset: Boolean,
    ) {
        val alreadyLoaded =
            assetId == this.assetId &&
                userAsset == _state.value.isUserAsset &&
                _state.value.detail != null
        if (alreadyLoaded) return
        this.assetId = assetId
        reload(userAsset)
    }

    private fun reload(userAsset: Boolean) {
        _state.value = AssetOverviewUiState(isLoading = true, isUserAsset = userAsset)
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val detail = store.getAssetDetail(assetId, userAsset)
                val defaultPair = detail.basePairId ?: detail.pairs.firstOrNull()?.assetId
                _state.value =
                    _state.value.copy(isLoading = false, detail = detail, selectedPairId = defaultPair)
                if (defaultPair != null) selectPair(defaultPair)
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(isLoading = false)
                _errors.emit(e.friendlyMessage())
            }
        }
    }

    fun selectPair(referenceId: Int) {
        _state.value =
            _state.value.copy(selectedPairId = referenceId, pairInfo = null, chartByPeriod = emptyMap(), isReloading = true)
        loadPairInfo(referenceId)
        loadRates(_state.value.selectedPeriod)
        viewModelScope.launch(Dispatchers.IO) {
            store.loadAssetOverview(assetId, referenceId)
        }
    }

    fun selectPeriod(period: TimePeriod) {
        _state.value = _state.value.copy(selectedPeriod = period)
        if (!_state.value.chartByPeriod.containsKey(period)) loadRates(period)
    }

    private fun loadPairInfo(referenceId: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val info = store.getAssetPair(assetId, referenceId, _state.value.isUserAsset)
                _state.value = _state.value.copy(pairInfo = info)
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _errors.emit(e.friendlyMessage())
            }
        }
    }

    private fun loadRates(period: TimePeriod) {
        val referenceId = _state.value.selectedPairId ?: return
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val rates =
                    store.getAssetPairRates(assetId, referenceId, period.apiRange, _state.value.isUserAsset)
                val points = rates.map { ChartPoint(date = it.timestamp, value = it.value) }
                _state.value =
                    _state.value.copy(chartByPeriod = _state.value.chartByPeriod + (period to points))
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _errors.emit(e.friendlyMessage())
            }
        }
    }

    fun pairs(): List<AssetPairRef> = _state.value.detail?.pairs ?: emptyList()

    fun addRate(
        date: Long,
        rate: Double,
    ) = launchCatching(_errors) {
        val referenceId = _state.value.selectedPairId ?: return@launchCatching
        store.addUserAssetRate(assetId, referenceId, date, rate)
        _state.value = _state.value.copy(chartByPeriod = emptyMap())
        selectPair(referenceId)
    }

    fun addPair(referenceId: Int) =
        launchCatching(_errors) {
            store.addUserAssetPair(assetId, referenceId)
            reload(_state.value.isUserAsset)
        }

    fun delete(onDone: () -> Unit) =
        launchCatching(_errors) {
            store.deleteUserAsset(assetId)
            withContext(Dispatchers.Main) { onDone() }
        }
}
