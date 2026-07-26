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
import uniffi.sverto_core.ProviderAccountTransaction

data class ProviderAccountDetailUiState(
    val transactions: List<ProviderAccountTransaction> = emptyList(),
    val svertoAccounts: List<AccountListItem> = emptyList(),
    val linkedTo: String? = null,
    val loading: Boolean = true,
    val justLinked: Boolean = false,
    val error: String? = null,
)

class ProviderAccountDetailViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ProviderAccountDetailUiState())
    val state: StateFlow<ProviderAccountDetailUiState> = _state.asStateFlow()

    fun load(
        connectionId: String,
        providerAccountId: String,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val transactions =
                    store.listConnectorProviderAccountTransactions(connectionId, providerAccountId)
                val linked =
                    store
                        .listConnectorBindings()
                        .firstOrNull {
                            it.connectionId == connectionId && it.providerAccountId == providerAccountId
                        }?.svertoAccountName
                val accounts = store.listSvertoAccounts()
                _state.value =
                    ProviderAccountDetailUiState(
                        transactions = transactions,
                        svertoAccounts = accounts,
                        linkedTo = linked,
                        loading = false,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(loading = false, error = e.message ?: "Failed to load transactions")
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
                _state.value = _state.value.copy(justLinked = true)
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
