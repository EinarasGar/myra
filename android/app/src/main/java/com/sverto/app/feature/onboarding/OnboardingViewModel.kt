package com.sverto.app.feature.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sverto.app.feature.assets.components.orderCurrencies
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.AssetItem

data class OnboardingUiState(
    val steps: List<OnboardingStepId> = emptyList(),
    val query: String = "",
    val currencyResults: List<AssetItem> = emptyList(),
    val selectedCurrency: AssetItem? = null,
    val isLoadingCurrencies: Boolean = false,
    val isFinishing: Boolean = false,
    val finished: Boolean = false,
    val error: String? = null,
)

class OnboardingViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state =
        MutableStateFlow(
            OnboardingUiState(steps = stepsForVersion(store.getOnboardingVersion())),
        )

    val state: StateFlow<OnboardingUiState> = _state.asStateFlow()

    private var allCurrencies: List<AssetItem> = emptyList()

    init {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoadingCurrencies = true)
            allCurrencies =
                orderCurrencies(runCatching { store.getAllCurrencies() }.getOrDefault(emptyList()))
            val storedDefaultId = store.getDefaultAssetId()
            _state.value =
                _state.value.copy(
                    currencyResults = filtered(_state.value.query),
                    selectedCurrency =
                        _state.value.selectedCurrency
                            ?: storedDefaultId?.let { id -> allCurrencies.firstOrNull { it.id == id } },
                    isLoadingCurrencies = false,
                )
        }
    }

    fun onQueryChange(query: String) {
        _state.value = _state.value.copy(query = query, currencyResults = filtered(query))
    }

    private fun filtered(query: String): List<AssetItem> {
        if (query.isBlank()) return allCurrencies
        return allCurrencies.filter {
            it.ticker.contains(query, ignoreCase = true) || it.name.contains(query, ignoreCase = true)
        }
    }

    fun selectCurrency(item: AssetItem) {
        _state.value = _state.value.copy(selectedCurrency = item)
    }

    fun saveBaseAsset() {
        val asset = _state.value.selectedCurrency ?: return
        viewModelScope.launch {
            runCatching { store.updateBaseAsset(asset.id) }
        }
    }

    fun finish() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isFinishing = true, error = null)
            val result =
                runCatching {
                    _state.value.selectedCurrency?.let { store.updateBaseAsset(it.id) }
                    store.setOnboardingVersion(CURRENT_ONBOARDING_VERSION)
                }
            _state.value =
                result.fold(
                    onSuccess = { _state.value.copy(isFinishing = false, finished = true) },
                    onFailure = { _state.value.copy(isFinishing = false, error = it.message) },
                )
        }
    }
}
