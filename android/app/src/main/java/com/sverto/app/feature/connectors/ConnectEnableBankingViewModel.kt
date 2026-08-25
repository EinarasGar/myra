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
import uniffi.sverto_core.Aspsp
import uniffi.sverto_core.CreateConnectionInput
import uniffi.sverto_core.CredentialMode
import uniffi.sverto_core.OAuthCompletionStatus

enum class EnableBankingPhase { IDLE, WORKING, DENIED, COMPLETED, FAILED }

data class ConnectEnableBankingUiState(
    val phase: EnableBankingPhase = EnableBankingPhase.IDLE,
    val launchUrl: String? = null,
    val connectionId: String? = null,
    val error: String? = null,
    val country: String? = null,
    val aspsps: List<Aspsp> = emptyList(),
    val selectedBank: String? = null,
    val banksLoading: Boolean = false,
)

class ConnectEnableBankingViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ConnectEnableBankingUiState())
    val state: StateFlow<ConnectEnableBankingUiState> = _state.asStateFlow()

    fun setCountry(country: String?) {
        _state.value =
            _state.value.copy(
                country = country,
                aspsps = emptyList(),
                selectedBank = null,
            )
        if (!country.isNullOrBlank()) {
            loadBanks()
        }
    }

    fun loadBanks() {
        val current = _state.value
        val country = current.country
        if (country.isNullOrBlank() || current.banksLoading) return
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(banksLoading = true)
            try {
                val banks =
                    store.listConnectorAspsps("enablebanking", country)
                        .sortedBy { it.name }
                _state.value = _state.value.copy(aspsps = banks, banksLoading = false)
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(
                        phase = EnableBankingPhase.FAILED,
                        error = e.message,
                        banksLoading = false,
                    )
            }
        }
    }

    fun selectBank(name: String?) {
        _state.value = _state.value.copy(selectedBank = name)
    }

    fun begin() {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(phase = EnableBankingPhase.WORKING, error = null)
            try {
                val connectionId =
                    store.createConnectorConnection(
                        CreateConnectionInput(
                            providerKind = "enablebanking",
                            credentialMode = CredentialMode.STORED,
                            credential = null,
                            providerKeyId = null,
                        ),
                    )
                val session =
                    store.createConnectorOauthSession(
                        connectionId,
                        _state.value.selectedBank,
                        _state.value.country?.takeIf { it.isNotBlank() },
                    )
                _state.value =
                    _state.value.copy(
                        phase = EnableBankingPhase.IDLE,
                        launchUrl = session.authUrl,
                        connectionId = connectionId,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(phase = EnableBankingPhase.FAILED, error = e.message)
            }
        }
    }

    fun consumeLaunchUrl() {
        _state.value = _state.value.copy(launchUrl = null)
    }

    fun consumeCompleted() {
        _state.value = _state.value.copy(phase = EnableBankingPhase.IDLE)
    }

    fun complete(
        state: String,
        code: String?,
        error: String?,
    ) {
        if (_state.value.phase == EnableBankingPhase.WORKING ||
            _state.value.phase == EnableBankingPhase.COMPLETED
        ) {
            return
        }
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(phase = EnableBankingPhase.WORKING, error = null)
            try {
                val result = store.completeConnectorOauthSession(state, code, error)
                _state.value =
                    _state.value.copy(
                        phase =
                            if (result.status == OAuthCompletionStatus.COMPLETED) {
                                EnableBankingPhase.COMPLETED
                            } else {
                                EnableBankingPhase.DENIED
                            },
                        connectionId = result.connection.id,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(phase = EnableBankingPhase.FAILED, error = e.message)
            }
        }
    }
}
