package com.sverto.app.feature.connectors

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.ConnectorBinding
import uniffi.sverto_core.ConnectorConnection

data class ConnectorsUiState(
    val connections: List<ConnectorConnection> = emptyList(),
    val bindings: List<ConnectorBinding> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

class ConnectorsViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ConnectorsUiState())
    val state: StateFlow<ConnectorsUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val connections = store.listConnectorConnections()
                val bindings = store.listConnectorBindings()
                _state.value =
                    ConnectorsUiState(
                        connections = connections,
                        bindings = bindings,
                        loading = false,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(
                        loading = false,
                        error = e.message ?: "Failed to load connectors",
                    )
            }
        }
    }

    fun revoke(connectionId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                store.revokeConnectorConnection(connectionId)
                load()
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(error = e.message ?: "Failed to revoke connection")
            }
        }
    }
}
