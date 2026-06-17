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
import uniffi.sverto_core.AccountIdentifier
import uniffi.sverto_core.AccountTypeItem
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.CreateAccountInput
import uniffi.sverto_core.UpdateAccountInput

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

    val identifiers = MutableStateFlow<List<AccountIdentifier>>(emptyList())
    private var editingAccountId: String? = null

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

    fun loadForEdit(accountId: String) {
        viewModelScope.launch {
            val result =
                withContext(Dispatchers.IO) {
                    runCatching { store.getAccount(accountId) }
                }
            result.onSuccess { model ->
                editingAccountId = model.id
                name.value = model.name
                selectedTypeId.value = model.accountTypeId
                selectedLiquidityId.value = model.liquidityTypeId
                ownershipShare.value = model.ownershipShare.toFloat()
                identifiers.value = model.identifiers
            }
        }
    }

    fun addIdentifier(
        kind: String,
        raw: String,
    ): String? {
        val value =
            when (kind) {
                "card_last4" -> raw.filter(Char::isDigit).take(4)
                "account_number" -> raw.filter(Char::isDigit)
                else -> raw.filter { !it.isWhitespace() }.uppercase()
            }
        val error =
            when (kind) {
                "card_last4" -> if (Regex("\\d{4}").matches(value)) null else "Card ending must be 4 digits."
                "account_number" -> if (Regex("\\d{4,34}").matches(value)) null else "Account number must be 4–34 digits."
                else -> if (Regex("[A-Z]{2}\\d{2}[A-Z0-9]{11,30}").matches(value)) null else "Enter a valid IBAN."
            }
        if (error != null) return error
        if (identifiers.value.any { it.kind == kind && it.value == value }) return "Already added."
        identifiers.value = identifiers.value + AccountIdentifier(kind, value)
        return null
    }

    fun removeIdentifier(identifier: AccountIdentifier) {
        identifiers.value = identifiers.value - identifier
    }

    val isValid: StateFlow<Boolean> =
        combine(name, selectedTypeId, selectedLiquidityId) { n, t, l ->
            n.isNotBlank() && t != null && l != null
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    fun save(onSuccess: () -> Unit) {
        val n = name.value.trim()
        val typeId = selectedTypeId.value ?: return
        val liqId = selectedLiquidityId.value ?: return
        val share = ownershipShare.value.toDouble()
        val ids = identifiers.value
        val editId = editingAccountId

        _submitState.value = SubmitState.Loading

        viewModelScope.launch {
            val result =
                withContext(Dispatchers.IO) {
                    runCatching {
                        if (editId == null) {
                            store.createAccount(
                                CreateAccountInput(
                                    name = n,
                                    accountTypeId = typeId,
                                    liquidityTypeId = liqId,
                                    ownershipShare = share,
                                    identifiers = ids,
                                ),
                            )
                        } else {
                            store.updateAccount(
                                editId,
                                UpdateAccountInput(
                                    name = n,
                                    accountTypeId = typeId,
                                    liquidityTypeId = liqId,
                                    ownershipShare = share,
                                    identifiers = ids,
                                ),
                            )
                        }
                    }
                }

            result.fold(
                onSuccess = {
                    _submitState.value = SubmitState.Idle
                    onSuccess()
                },
                onFailure = { e ->
                    _submitState.value = SubmitState.Error(e.message ?: "Failed to save account")
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
