package com.sverto.app.feature.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AccountDetailObserver
import uniffi.sverto_core.AccountDetailState
import uniffi.sverto_core.ApiException
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.ConnectorBinding
import uniffi.sverto_core.CredentialMode

data class AccountSyncTarget(
    val binding: ConnectorBinding,
    val credentialMode: CredentialMode,
)

data class AccountSyncUiState(
    val targets: List<AccountSyncTarget> = emptyList(),
    val lastSyncAt: Long? = null,
    val syncing: Boolean = false,
    val message: String? = null,
    val promptConnectionId: String? = null,
)

class AccountDetailViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state =
        MutableStateFlow(
            AccountDetailState(
                isLoading = true,
                error = null,
                accountId = "",
                accountName = "",
                accountTypeId = 0,
                chartData = emptyList(),
                holdings = emptyList(),
                cashBalance = 0.0,
                totalValue = 0.0,
                totalCostBasis = 0.0,
                unrealizedGains = 0.0,
                realizedGains = 0.0,
                totalFees = 0.0,
                recentTransactions = emptyList(),
                baseTicker = "",
            ),
        )
    val state: StateFlow<AccountDetailState> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _syncState = MutableStateFlow(AccountSyncUiState())
    val syncState: StateFlow<AccountSyncUiState> = _syncState.asStateFlow()

    private val observer =
        object : AccountDetailObserver {
            override fun onAccountDetailChanged(state: AccountDetailState) {
                val wasRefreshing = _isRefreshing.value
                _state.value = state
                if (wasRefreshing && !state.isLoading) {
                    _isRefreshing.value = false
                }
            }
        }

    init {
        store.observeAccountDetail(observer)
    }

    fun load(
        accountId: String,
        accountName: String,
        accountTypeId: Int,
    ) {
        viewModelScope.launch { store.loadAccountDetail(accountId, accountName, accountTypeId) }
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch { store.refreshAccountDetail() }
    }

    fun delete(
        accountId: String,
        onDeleted: () -> Unit,
    ) {
        viewModelScope.launch {
            val result =
                withContext(Dispatchers.IO) {
                    runCatching { store.deleteAccount(accountId) }
                }
            result.onSuccess { onDeleted() }
        }
    }

    fun loadSyncInfo(accountId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val connections = store.listConnectorConnections().associateBy { it.id }
                val targets =
                    store
                        .listConnectorBindings()
                        .filter { it.svertoAccountId == accountId }
                        .mapNotNull { binding ->
                            connections[binding.connectionId]?.let {
                                AccountSyncTarget(binding, it.credentialMode)
                            }
                        }
                _syncState.value =
                    _syncState.value.copy(
                        targets = targets,
                        lastSyncAt = targets.mapNotNull { it.binding.lastSyncAt }.maxOrNull(),
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
        }
    }

    fun sync(accountId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            _syncState.value = _syncState.value.copy(syncing = true, message = null)
            var queued = 0
            var imported = 0L
            var failure: String? = null
            for (target in _syncState.value.targets.filter { it.binding.status == "active" }) {
                try {
                    val outcome =
                        store.syncConnectorBinding(
                            target.binding.id,
                            target.binding.connectionId,
                            target.credentialMode,
                        )
                    when (outcome.status) {
                        "queued" -> queued++
                        else -> imported += outcome.report?.newTransactions ?: 0
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (_: ApiException.MissingLocalCredential) {
                    _syncState.value =
                        _syncState.value.copy(
                            syncing = false,
                            promptConnectionId = target.binding.connectionId,
                        )
                    return@launch
                } catch (
                    @Suppress("TooGenericExceptionCaught") e: Exception,
                ) {
                    failure = e.message
                }
            }
            val message =
                failure ?: when {
                    queued > 0 && imported == 0L -> "Sync started"
                    imported > 0 -> "$imported new transactions"
                    else -> "Up to date"
                }
            _syncState.value = _syncState.value.copy(syncing = false, message = message)
            refresh()
            loadSyncInfo(accountId)
        }
    }

    fun saveTransientKey(
        connectionId: String,
        key: String,
        accountId: String,
    ) {
        store.saveConnectorCredential(connectionId, key)
        _syncState.value = _syncState.value.copy(promptConnectionId = null)
        sync(accountId)
    }

    fun dismissKeyPrompt() {
        _syncState.value = _syncState.value.copy(promptConnectionId = null)
    }

    fun consumeSyncMessage() {
        _syncState.value = _syncState.value.copy(message = null)
    }

    override fun onCleared() {
        store.unobserveAccountDetail()
    }
}
