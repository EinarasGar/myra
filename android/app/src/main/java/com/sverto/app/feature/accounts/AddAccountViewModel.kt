package com.sverto.app.feature.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AccountTypeItem
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.CreateAccountInput

sealed interface SubmitState {
    data object Idle : SubmitState

    data object Loading : SubmitState

    data class Error(
        val message: String,
    ) : SubmitState
}

class AddAccountViewModel(
    private val store: AppStore,
) : ViewModel() {
    val name = MutableStateFlow("")
    val selectedTypeId = MutableStateFlow<Int?>(null)
    val selectedLiquidityId = MutableStateFlow<Int?>(1)
    val ownershipShare = MutableStateFlow(1.0f)

    private val _accountTypes = MutableStateFlow<List<AccountTypeItem>>(emptyList())
    val accountTypes: StateFlow<List<AccountTypeItem>> = _accountTypes.asStateFlow()

    private val _typesLoading = MutableStateFlow(true)
    val typesLoading: StateFlow<Boolean> = _typesLoading.asStateFlow()

    private val _submitState = MutableStateFlow<SubmitState>(SubmitState.Idle)
    val submitState: StateFlow<SubmitState> = _submitState.asStateFlow()

    init {
        loadAccountTypes()
    }

    private fun loadAccountTypes() {
        viewModelScope.launch {
            _typesLoading.value = true
            withContext(Dispatchers.IO) {
                runCatching { store.getAccountTypes() }
            }.onSuccess { _accountTypes.value = it }
            _typesLoading.value = false
        }
    }

    val isValid: StateFlow<Boolean> =
        combine(name, selectedTypeId, selectedLiquidityId) { n, t, l ->
            n.isNotBlank() && t != null && l != null
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    fun createAccount(onSuccess: () -> Unit) {
        val n = name.value.trim()
        val typeId = selectedTypeId.value ?: return
        val liqId = selectedLiquidityId.value ?: return
        val share = ownershipShare.value.toDouble()

        _submitState.value = SubmitState.Loading

        viewModelScope.launch {
            val result =
                withContext(Dispatchers.IO) {
                    runCatching {
                        store.createAccount(
                            CreateAccountInput(
                                name = n,
                                accountTypeId = typeId,
                                liquidityTypeId = liqId,
                                ownershipShare = share,
                            ),
                        )
                    }
                }

            result.fold(
                onSuccess = {
                    _submitState.value = SubmitState.Idle
                    onSuccess()
                },
                onFailure = { e ->
                    _submitState.value =
                        SubmitState.Error(
                            e.message ?: "Failed to create account",
                        )
                },
            )
        }
    }

    fun clearError() {
        if (_submitState.value is SubmitState.Error) {
            _submitState.value = SubmitState.Idle
        }
    }
}
