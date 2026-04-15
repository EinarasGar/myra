package com.sverto.app.feature.transactions.create

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.ClerkResult
import com.sverto.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AccountItem
import uniffi.sverto_core.ApiClient
import uniffi.sverto_core.AssetItem
import uniffi.sverto_core.CategoryItem
import uniffi.sverto_core.CreateTransactionInput
import uniffi.sverto_core.EditableTransaction
import uniffi.sverto_core.TransactionListItem
import java.math.BigDecimal
import kotlin.math.abs

private const val TAG = "CreateTransactionVM"
private const val SEARCH_DEBOUNCE_MS = 300L
private const val SEARCH_PAGE_SIZE = 20u

class CreateTransactionViewModel : ViewModel() {
    private val apiClient = ApiClient(BuildConfig.API_BASE_URL, 60u)
    private var userId: String? = null
    private var editTransactionId: String? = null

    private val _accounts = MutableStateFlow<List<AccountItem>>(emptyList())
    val accounts: StateFlow<List<AccountItem>> = _accounts.asStateFlow()

    private val _assetResults = MutableStateFlow<List<AssetItem>>(emptyList())
    val assetResults: StateFlow<List<AssetItem>> = _assetResults.asStateFlow()

    private val _categoryResults = MutableStateFlow<List<CategoryItem>>(emptyList())
    val categoryResults: StateFlow<List<CategoryItem>> = _categoryResults.asStateFlow()

    private val _formState = MutableStateFlow(TransactionFormState())
    val formState: StateFlow<TransactionFormState> = _formState.asStateFlow()

    private val _submitState = MutableStateFlow(SubmitState.IDLE)
    val submitState: StateFlow<SubmitState> = _submitState.asStateFlow()

    private val _submittedTransaction = MutableStateFlow<TransactionListItem?>(null)
    val submittedTransaction: StateFlow<TransactionListItem?> = _submittedTransaction.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private var assetSearchJob: Job? = null
    private var categorySearchJob: Job? = null

    fun init() {
        editTransactionId = null
        resetUiState()
        viewModelScope.launch(Dispatchers.IO) {
            try {
                loadSessionContext()
                _formState.value = TransactionFormState(date = System.currentTimeMillis() / 1000)
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e(TAG, "Init failed", e)
            }
        }
    }

    fun initForEdit(transactionId: String) {
        editTransactionId = transactionId
        resetUiState()
        _isLoading.value = true
        _formState.value = TransactionFormState()

        viewModelScope.launch(Dispatchers.IO) {
            try {
                val me = loadSessionContext()
                val editable = apiClient.getIndividualTransaction(me.userId, transactionId)
                _formState.value = editable.toFormState()
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e(TAG, "Edit init failed", e)
                _errorMessage.value = e.message ?: "Unknown error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun refreshAuthToken() {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) return
        when (val result = Clerk.auth.getToken()) {
            is ClerkResult.Success -> apiClient.setAuthToken(result.value)
            is ClerkResult.Failure -> Log.e(TAG, "Auth failed: ${result.error}")
        }
    }

    private suspend fun loadSessionContext(): uniffi.sverto_core.AuthMe {
        refreshAuthToken()
        val me = apiClient.getMe()
        userId = me.userId
        _accounts.value = apiClient.getAccounts(me.userId)
        return me
    }

    private fun resetUiState() {
        _submitState.value = SubmitState.IDLE
        _errorMessage.value = null
        _assetResults.value = emptyList()
        _categoryResults.value = emptyList()
        _submittedTransaction.value = null
        _isLoading.value = false
    }

    fun searchAssets(query: String) {
        assetSearchJob?.cancel()
        if (query.isBlank()) {
            _assetResults.value = emptyList()
            return
        }
        assetSearchJob =
            viewModelScope.launch(Dispatchers.IO) {
                delay(SEARCH_DEBOUNCE_MS)
                try {
                    _assetResults.value = apiClient.searchAssets(query, SEARCH_PAGE_SIZE, 0u)
                } catch (
                    @Suppress("TooGenericExceptionCaught") e: Exception,
                ) {
                    Log.e(TAG, "Asset search failed", e)
                }
            }
    }

    fun searchCategories(query: String) {
        categorySearchJob?.cancel()
        if (query.isBlank()) {
            _categoryResults.value = emptyList()
            return
        }
        categorySearchJob =
            viewModelScope.launch(Dispatchers.IO) {
                delay(SEARCH_DEBOUNCE_MS)
                try {
                    _categoryResults.value =
                        apiClient.searchCategories(query, SEARCH_PAGE_SIZE, 0u)
                } catch (
                    @Suppress("TooGenericExceptionCaught") e: Exception,
                ) {
                    Log.e(TAG, "Category search failed", e)
                }
            }
    }

    fun updateDate(millis: Long) {
        _formState.value = _formState.value.copy(date = millis / 1000)
    }

    fun updateDescription(value: String) {
        _formState.value = _formState.value.copy(description = value)
    }

    fun selectCategory(item: CategoryItem) {
        _formState.value =
            _formState.value.copy(
                categoryId = item.id,
                categoryName = item.name,
            )
        _categoryResults.value = emptyList()
    }

    fun selectOriginAsset(item: AssetItem) {
        _formState.value =
            _formState.value.copy(
                originAssetId = item.id,
                originAssetDisplay = item.display,
            )
        _assetResults.value = emptyList()
    }

    fun updatePrimaryAccount(item: AccountItem) {
        _formState.value =
            _formState.value.copy(
                primaryEntry =
                    _formState.value.primaryEntry.copy(
                        accountId = item.id,
                        accountName = item.name,
                    ),
            )
    }

    fun updatePrimaryAsset(item: AssetItem) {
        _formState.value =
            _formState.value.copy(
                primaryEntry =
                    _formState.value.primaryEntry.copy(
                        assetId = item.id,
                        assetDisplay = item.display,
                    ),
            )
        _assetResults.value = emptyList()
    }

    fun updatePrimaryAmount(value: String) {
        _formState.value =
            _formState.value.copy(
                primaryEntry = _formState.value.primaryEntry.copy(amount = value),
            )
    }

    fun updateSecondaryAccount(item: AccountItem) {
        _formState.value =
            _formState.value.copy(
                secondaryEntry =
                    _formState.value.secondaryEntry.copy(
                        accountId = item.id,
                        accountName = item.name,
                    ),
            )
    }

    fun updateSecondaryAsset(item: AssetItem) {
        _formState.value =
            _formState.value.copy(
                secondaryEntry =
                    _formState.value.secondaryEntry.copy(
                        assetId = item.id,
                        assetDisplay = item.display,
                    ),
            )
        _assetResults.value = emptyList()
    }

    fun updateSecondaryAmount(value: String) {
        _formState.value =
            _formState.value.copy(
                secondaryEntry = _formState.value.secondaryEntry.copy(amount = value),
            )
    }

    fun submit(config: TransactionTypeConfig) {
        val uid = userId ?: return
        val input =
            buildInput(config, _formState.value) ?: run {
                _errorMessage.value = "Missing required fields"
                return
            }
        _submitState.value = SubmitState.SUBMITTING
        _errorMessage.value = null

        viewModelScope.launch(Dispatchers.IO) {
            try {
                refreshAuthToken()
                val transactionId = editTransactionId
                _submittedTransaction.value =
                    if (transactionId == null) {
                        apiClient.createIndividualTransaction(uid, input)
                        null
                    } else {
                        apiClient.updateIndividualTransaction(uid, transactionId, input)
                    }
                _submitState.value = SubmitState.SUCCESS
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e(TAG, "Submit failed", e)
                _errorMessage.value = e.message ?: "Unknown error"
                _submitState.value = SubmitState.IDLE
            }
        }
    }
}

private fun EditableTransaction.toFormState(): TransactionFormState =
    TransactionFormState(
        date = date,
        description = description,
        categoryId = categoryId,
        categoryName = categoryName,
        originAssetId = originAssetId,
        originAssetDisplay = originAssetDisplay,
        primaryEntry =
            EntryFormState(
                entryId = primaryEntryId,
                accountId = primaryAccountId,
                accountName = primaryAccountName,
                assetId = primaryAssetId,
                assetDisplay = primaryAssetDisplay,
                amount = editableAmount(primaryAmount),
            ),
        secondaryEntry =
            EntryFormState(
                entryId = secondaryEntryId,
                accountId = secondaryAccountId,
                accountName = secondaryAccountName.orEmpty(),
                assetId = secondaryAssetId,
                assetDisplay = secondaryAssetDisplay.orEmpty(),
                amount = secondaryAmount?.let(::editableAmount).orEmpty(),
            ),
    )

private fun editableAmount(value: Double): String = BigDecimal.valueOf(value).stripTrailingZeros().toPlainString()

@Suppress("ReturnCount")
private fun buildInput(
    config: TransactionTypeConfig,
    state: TransactionFormState,
): CreateTransactionInput? {
    val date = state.date ?: return null
    val primaryAccountId = state.primaryEntry.accountId ?: return null
    val primaryAssetId = state.primaryEntry.assetId ?: return null
    val primaryAmount = signedAmount(state.primaryEntry.amount, primarySign(config)) ?: return null

    val secondaryAccountId: String?
    val secondaryAssetId: Int?
    val secondaryAmount: Double?
    when (val mode = config.entryMode) {
        is EntryMode.Single -> {
            secondaryAccountId = null
            secondaryAssetId = null
            secondaryAmount = null
        }
        is EntryMode.Dual -> {
            val secAccount =
                if (mode.sameAccount) primaryAccountId else state.secondaryEntry.accountId
            val secAsset = state.secondaryEntry.assetId
            val secAmt = signedAmount(state.secondaryEntry.amount, mode.secondarySign)
            if (secAccount == null || secAsset == null || secAmt == null) return null
            secondaryAccountId = secAccount
            secondaryAssetId = secAsset
            secondaryAmount = secAmt
        }
    }

    return CreateTransactionInput(
        typeKey = config.apiType,
        date = date,
        primaryEntryId = state.primaryEntry.entryId,
        primaryAccountId = primaryAccountId,
        primaryAssetId = primaryAssetId,
        primaryAmount = primaryAmount,
        secondaryEntryId = state.secondaryEntry.entryId,
        secondaryAccountId = secondaryAccountId,
        secondaryAssetId = secondaryAssetId,
        secondaryAmount = secondaryAmount,
        originAssetId = state.originAssetId,
        categoryId = state.categoryId,
        description = state.description.ifBlank { null },
    )
}

private fun primarySign(config: TransactionTypeConfig): AmountSign =
    when (val mode = config.entryMode) {
        is EntryMode.Single -> mode.amountSign
        is EntryMode.Dual -> mode.primarySign
    }

private fun signedAmount(
    raw: String,
    sign: AmountSign,
): Double? {
    val parsed = raw.toDoubleOrNull() ?: return null
    return when (sign) {
        AmountSign.POSITIVE -> abs(parsed)
        AmountSign.NEGATIVE -> -abs(parsed)
        AmountSign.ANY -> parsed
    }
}
