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
import uniffi.sverto_core.CreateConnectionInput
import uniffi.sverto_core.CredentialMode
import uniffi.sverto_core.OAuthCompletionStatus

enum class TrueLayerPhase { IDLE, WORKING, DENIED, COMPLETED, FAILED }

data class ConnectTrueLayerUiState(
    val phase: TrueLayerPhase = TrueLayerPhase.IDLE,
    val launchUrl: String? = null,
    val connectionId: String? = null,
    val error: String? = null,
)

class ConnectTrueLayerViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ConnectTrueLayerUiState())
    val state: StateFlow<ConnectTrueLayerUiState> = _state.asStateFlow()

    fun begin() {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(phase = TrueLayerPhase.WORKING, error = null)
            try {
                val connectionId =
                    store.createConnectorConnection(
                        CreateConnectionInput(
                            providerKind = "truelayer",
                            credentialMode = CredentialMode.STORED,
                            credential = null,
                            providerKeyId = null,
                        ),
                    )
                val session =
                    store.createConnectorOauthSession(connectionId)
                _state.value =
                    _state.value.copy(
                        phase = TrueLayerPhase.IDLE,
                        launchUrl = session.authUrl,
                        connectionId = connectionId,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(phase = TrueLayerPhase.FAILED, error = e.message)
            }
        }
    }

    fun consumeLaunchUrl() {
        _state.value = _state.value.copy(launchUrl = null)
    }

    fun consumeCompleted() {
        _state.value = _state.value.copy(phase = TrueLayerPhase.IDLE)
    }

    fun complete(
        state: String,
        code: String?,
        error: String?,
    ) {
        if (_state.value.phase == TrueLayerPhase.WORKING ||
            _state.value.phase == TrueLayerPhase.COMPLETED
        ) {
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(phase = TrueLayerPhase.WORKING, error = null)
            try {
                val result = store.completeConnectorOauthSession(state, code, error)
                _state.value =
                    _state.value.copy(
                        phase =
                            if (result.status == OAuthCompletionStatus.COMPLETED) {
                                TrueLayerPhase.COMPLETED
                            } else {
                                TrueLayerPhase.DENIED
                            },
                        connectionId = result.connection.id,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(phase = TrueLayerPhase.FAILED, error = e.message)
            }
        }
    }
}
