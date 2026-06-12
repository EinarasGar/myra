package com.sverto.app.feature.assets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sverto.app.core.friendlyMessage
import com.sverto.app.core.launchCatching
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.AssetSummary
import uniffi.sverto_core.AssetTypeOption

data class CustomAssetsState(
    val isLoading: Boolean = true,
    val assets: List<AssetSummary> = emptyList(),
    val assetTypes: List<AssetTypeOption> = emptyList(),
)

class CustomAssetsViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(CustomAssetsState())
    val state = _state.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors = _errors.asSharedFlow()

    fun load() {
        viewModelScope.launch(Dispatchers.IO) {
            // Only show the full-screen spinner on the first load; a refresh-on-return
            // (e.g. after deleting an asset from its detail screen) updates in place.
            if (_state.value.assets.isEmpty()) {
                _state.value = _state.value.copy(isLoading = true)
            }
            try {
                coroutineScope {
                    val assets = async { store.getUserAssets() }
                    // Asset types are static reference data; only fetch them once.
                    val types =
                        if (_state.value.assetTypes.isEmpty()) {
                            async { store.getAssetTypes() }
                        } else {
                            null
                        }
                    _state.value =
                        _state.value.copy(
                            isLoading = false,
                            assets = assets.await(),
                            assetTypes = types?.await() ?: _state.value.assetTypes,
                        )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(isLoading = false)
                _errors.emit(e.friendlyMessage())
            }
        }
    }

    fun createAsset(
        name: String,
        ticker: String,
        assetType: Int,
        baseAssetId: Int,
    ) = launchCatching(_errors) {
        store.createUserAsset(name, ticker, assetType, baseAssetId)
        load()
    }
}
