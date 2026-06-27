package com.sverto.app.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AiUsage
import uniffi.sverto_core.AppStore

data class AiUsageUiState(
    val usage: AiUsage? = null,
    val error: String? = null,
)

class AiUsageViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(AiUsageUiState())
    val state: StateFlow<AiUsageUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(error = null)
            try {
                val usage = store.getAiUsage()
                _state.value = AiUsageUiState(usage = usage)
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(
                        error = e.message ?: "Failed to load AI usage",
                    )
            }
        }
    }
}
