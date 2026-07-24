package com.sverto.app.feature.connectors

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.BindingStatus
import uniffi.sverto_core.BindingWriteMode
import uniffi.sverto_core.ConnectorBinding
import uniffi.sverto_core.ConnectorConnection

data class ConnectionDetailUiState(
    val connection: ConnectorConnection? = null,
    val bindings: List<ConnectorBinding> = emptyList(),
    val providerAccountNames: Map<String, String> = emptyMap(),
    val loading: Boolean = true,
    val error: String? = null,
)

class ConnectionDetailViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ConnectionDetailUiState())
    val state: StateFlow<ConnectionDetailUiState> = _state.asStateFlow()

    fun load(connectionId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val connection = store.listConnectorConnections().firstOrNull { it.id == connectionId }
                val bindings = store.listConnectorBindings().filter { it.connectionId == connectionId }
                val providerAccountNames =
                    try {
                        store
                            .listConnectorProviderAccounts(connectionId)
                            .associate { it.providerAccountId to it.displayName }
                    } catch (e: CancellationException) {
                        throw e
                    } catch (
                        @Suppress("TooGenericExceptionCaught", "SwallowedException") e: Exception,
                    ) {
                        emptyMap()
                    }
                _state.value =
                    ConnectionDetailUiState(
                        connection = connection,
                        bindings = bindings,
                        providerAccountNames = providerAccountNames,
                        loading = false,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(loading = false, error = e.message ?: "Failed to load connection")
            }
        }
    }

    fun updateBinding(
        binding: ConnectorBinding,
        writeMode: BindingWriteMode,
        status: BindingStatus,
    ) {
        val previous = _state.value.bindings
        _state.value =
            _state.value.copy(
                bindings =
                    previous.map {
                        if (it.id == binding.id) {
                            it.copy(
                                writeMode = writeMode,
                                status = if (status == BindingStatus.ACTIVE) "active" else "paused",
                            )
                        } else {
                            it
                        }
                    },
            )
        viewModelScope.launch(Dispatchers.IO) {
            try {
                store.updateConnectorBinding(binding.id, writeMode, status)
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(bindings = previous, error = e.message ?: "Failed to update binding")
            }
        }
    }

    fun deleteBinding(
        bindingId: String,
        connectionId: String,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                store.deleteConnectorBinding(bindingId)
                load(connectionId)
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to delete binding")
            }
        }
    }

    fun revoke(
        connectionId: String,
        onDone: () -> Unit,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                store.revokeConnectorConnection(connectionId)
                withContext(Dispatchers.Main) { onDone() }
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to revoke connection")
            }
        }
    }
}
