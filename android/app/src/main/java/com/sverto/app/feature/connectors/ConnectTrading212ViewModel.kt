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
import uniffi.sverto_core.CreateConnectionInput
import uniffi.sverto_core.CredentialMode

data class ConnectT212UiState(
    val submitting: Boolean = false,
    val error: String? = null,
)

class ConnectTrading212ViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ConnectT212UiState())
    val state: StateFlow<ConnectT212UiState> = _state.asStateFlow()

    fun connect(
        mode: CredentialMode,
        apiKeyId: String,
        apiKey: String,
        onCreated: (String) -> Unit,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = ConnectT212UiState(submitting = true)
            try {
                val connectionId =
                    store.createConnectorConnection(
                        CreateConnectionInput(
                            providerKind = "trading212",
                            credentialMode = mode,
                            credential = if (mode == CredentialMode.STORED) apiKey else null,
                            providerKeyId = apiKeyId.ifBlank { null },
                        ),
                    )
                if (mode == CredentialMode.TRANSIENT) {
                    store.saveConnectorCredential(connectionId, apiKey)
                }
                withContext(Dispatchers.Main) { onCreated(connectionId) }
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = ConnectT212UiState(error = e.message ?: "Failed to connect")
            }
        }
    }
}
