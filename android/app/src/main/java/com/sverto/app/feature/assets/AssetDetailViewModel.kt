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
import uniffi.sverto_core.AssetPairDetail
import uniffi.sverto_core.AssetPairRef

data class AssetDetailUiState(
    val isLoading: Boolean = true,
    val detail: AssetDetail? = null,
    val selectedPairId: Int? = null,
    val pairInfo: AssetPairDetail? = null,
    val selectedPeriod: TimePeriod = TimePeriod.MONTH,
    val chartByPeriod: Map<TimePeriod, List<ChartPoint>> = emptyMap(),
    val isUserAsset: Boolean = false,
)

class AssetDetailViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(AssetDetailUiState())
    val state = _state.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors = _errors.asSharedFlow()

    private var assetId: Int = 0

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
        _state.value = AssetDetailUiState(isLoading = true, isUserAsset = userAsset)
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
            _state.value.copy(selectedPairId = referenceId, pairInfo = null, chartByPeriod = emptyMap())
        loadPairInfo(referenceId)
        loadRates(_state.value.selectedPeriod)
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
