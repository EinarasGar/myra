package com.sverto.app.feature.transactions.create

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sverto.app.feature.transactions.group.GroupTransactionItem
import com.sverto.app.feature.transactions.quickupload.proposalToFormState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AccountItem
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.AssetItem
import uniffi.sverto_core.CategoryItem
import uniffi.sverto_core.CreateTransactionInput
import uniffi.sverto_core.EditableTransaction
import uniffi.sverto_core.TransactionListItem
import java.math.BigDecimal
import kotlin.math.abs

private const val TAG = "CreateTransactionVM"
private const val SEARCH_DEBOUNCE_MS = 300L

class CreateTransactionViewModel(
    private val store: AppStore,
) : ViewModel() {
    private var initialized = false
    private var editTransactionId: String? = null

    private var groupTransactionCallback: ((GroupTransactionItem) -> Unit)? = null

    fun setGroupCallback(callback: ((GroupTransactionItem) -> Unit)?) {
        groupTransactionCallback = callback
    }

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

    private val _quickUploadId = MutableStateFlow<String?>(null)
    val quickUploadId: StateFlow<String?> = _quickUploadId.asStateFlow()

    private val _correctionState = MutableStateFlow(CorrectionState.IDLE)
    val correctionState: StateFlow<CorrectionState> = _correctionState.asStateFlow()

    private val _correctionTypeChange = MutableStateFlow<CorrectionTypeChange?>(null)
    val correctionTypeChange: StateFlow<CorrectionTypeChange?> = _correctionTypeChange.asStateFlow()

    private var assetSearchJob: Job? = null
    private var categorySearchJob: Job? = null

    fun init() {
        if (initialized) return
        initialized = true
        editTransactionId = null
        resetUiState()
        viewModelScope.launch(Dispatchers.IO) {
            try {
                _accounts.value = store.getAccountsList()
                _formState.value = TransactionFormState(date = System.currentTimeMillis() / 1000)
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e(TAG, "Init failed", e)
            }
        }
    }

    fun initForEdit(transactionId: String) {
        if (initialized) return
        initialized = true
        editTransactionId = transactionId
        resetUiState()
        _isLoading.value = true
        _formState.value = TransactionFormState()

        viewModelScope.launch(Dispatchers.IO) {
            try {
                _accounts.value = store.getAccountsList()
                val editable = store.getEditableTransaction(transactionId)
                _formState.value = editable.toFormState(transactionId = transactionId)
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

    fun initForGroupEdit(
        existingInput: CreateTransactionInput,
        displayData: GroupEditDisplayData,
    ) {
        if (initialized) return
        initialized = true
        editTransactionId = existingInput.transactionId
        resetUiState()
        _formState.value =
            TransactionFormState(
                transactionId = existingInput.transactionId,
                date = existingInput.date,
                description = existingInput.description.orEmpty(),
                categoryId = existingInput.categoryId,
                categoryName = displayData.categoryName,
                originAssetId = existingInput.originAssetId,
                originAssetDisplay = displayData.originAssetDisplay,
                primaryEntry =
                    EntryFormState(
                        entryId = existingInput.primaryEntryId,
                        accountId = existingInput.primaryAccountId,
                        accountName = displayData.primaryAccountName,
                        assetId = existingInput.primaryAssetId,
                        assetDisplay = displayData.primaryAssetDisplay,
                        amount = editableAmount(existingInput.primaryAmount),
                    ),
                secondaryEntry =
                    EntryFormState(
                        entryId = existingInput.secondaryEntryId,
                        accountId = existingInput.secondaryAccountId,
                        accountName = displayData.secondaryAccountName.orEmpty(),
                        assetId = existingInput.secondaryAssetId,
                        assetDisplay = displayData.secondaryAssetDisplay.orEmpty(),
                        amount = existingInput.secondaryAmount?.let(::editableAmount).orEmpty(),
                    ),
            )
        viewModelScope.launch(Dispatchers.IO) {
            try {
                _accounts.value = store.getAccountsList()
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e(TAG, "Group edit init failed", e)
            }
        }
    }

    fun initFromProposal(quickUploadId: String) {
        if (initialized) return
        initialized = true
        editTransactionId = null
        resetUiState()
        _isLoading.value = true

        viewModelScope.launch(Dispatchers.IO) {
            try {
                _accounts.value = store.getAccountsList()
                val detail = store.getQuickUploadDetail(quickUploadId)
                val formState = proposalToFormState(
                    detail.proposalData ?: "{}",
                    detail.lookupTables,
                )
                _formState.value = formState
                _quickUploadId.value = quickUploadId
            } catch (@Suppress("TooGenericExceptionCaught") e: Exception) {
                Log.e(TAG, "Proposal init failed", e)
                _errorMessage.value = e.message ?: "Failed to load proposal"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun sendCorrection(message: String) {
        val uploadId = _quickUploadId.value ?: return
        _correctionState.value = CorrectionState.SENDING
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val detail = store.sendQuickUploadCorrection(uploadId, message)
                if (detail.proposalType == "transaction_group") {
                    _correctionState.value = CorrectionState.IDLE
                    _correctionTypeChange.value = CorrectionTypeChange(uploadId, detail.proposalType!!)
                    return@launch
                }
                _formState.value = proposalToFormState(
                    detail.proposalData ?: "{}",
                    detail.lookupTables,
                )
                _correctionState.value = CorrectionState.UPDATED
                delay(2000)
                _correctionState.value = CorrectionState.IDLE
            } catch (@Suppress("TooGenericExceptionCaught") e: Exception) {
                Log.e(TAG, "Correction failed", e)
                _correctionState.value = CorrectionState.IDLE
            }
        }
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
                    _assetResults.value = store.searchAssets(query)
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
                    _categoryResults.value = store.searchCategories(query)
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
        val input = buildInput(config, _formState.value)
        if (input == null) {
            _errorMessage.value = "Missing required fields"
            return
        }

        val callback = groupTransactionCallback
        if (callback != null) {
            _submitState.value = SubmitState.SUBMITTING
            val state = _formState.value
            callback(
                GroupTransactionItem(
                    input = input,
                    descriptionDisplay = state.description.ifBlank { config.label },
                    typeLabel = config.label,
                    amountDisplay = formatAmount(input),
                    accountName = state.primaryEntry.accountName,
                    assetDisplay = state.primaryEntry.assetDisplay,
                    categoryName = state.categoryName,
                ),
            )
            _submitState.value = SubmitState.SUCCESS
        } else {
            _submitState.value = SubmitState.SUBMITTING
            _errorMessage.value = null

            viewModelScope.launch(Dispatchers.IO) {
                try {
                    val transactionId = editTransactionId
                    _submittedTransaction.value =
                        if (transactionId == null) {
                            store.createIndividualTransaction(input)
                            null
                        } else {
                            store.updateIndividualTransaction(transactionId, input)
                        }
                    val qId = _quickUploadId.value
                    if (qId != null) {
                        store.completeQuickUpload(qId, true)
                        _quickUploadId.value = null
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
}

private fun EditableTransaction.toFormState(transactionId: String? = null): TransactionFormState =
    TransactionFormState(
        transactionId = transactionId,
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
        transactionId = state.transactionId,
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

private fun formatAmount(input: CreateTransactionInput): String = editableAmount(input.primaryAmount)
