package com.sverto.app.feature.connectors

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AccountListItem
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.ProviderAccount

data class BindingSetupUiState(
    val providerAccounts: List<ProviderAccount> = emptyList(),
    val boundAccounts: Map<String, String> = emptyMap(),
    val svertoAccounts: List<AccountListItem> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

class BindingSetupViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(BindingSetupUiState())
    val state: StateFlow<BindingSetupUiState> = _state.asStateFlow()

    fun load(connectionId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val provider = store.listConnectorProviderAccounts(connectionId)
                val bound =
                    store
                        .listConnectorBindings()
                        .filter { it.connectionId == connectionId }
                        .associate { it.providerAccountId to it.svertoAccountName }
                val accounts = store.listSvertoAccounts()
                _state.value =
                    BindingSetupUiState(
                        providerAccounts = provider,
                        boundAccounts = bound,
                        svertoAccounts = accounts,
                        loading = false,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Failed to load accounts")
            }
        }
    }

    fun bind(
        connectionId: String,
        providerAccountId: String,
        svertoAccountId: String,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                store.createConnectorBinding(connectionId, svertoAccountId, providerAccountId)
                load(connectionId)
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value = _state.value.copy(error = e.message ?: "Failed to link account")
            }
        }
    }
}
