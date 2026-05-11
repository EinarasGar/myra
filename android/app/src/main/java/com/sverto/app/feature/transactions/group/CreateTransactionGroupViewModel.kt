package com.sverto.app.feature.transactions.group

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sverto.app.feature.transactions.create.CorrectionState
import com.sverto.app.feature.transactions.create.CorrectionTypeChange
import com.sverto.app.feature.transactions.create.apiTypeToConfigKey
import com.sverto.app.feature.transactions.create.getTransactionTypeConfig
import com.sverto.app.feature.transactions.quickupload.proposalToGroupFormState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.CategoryItem
import uniffi.sverto_core.CreateTransactionGroupInput
import uniffi.sverto_core.CreateTransactionInput
import uniffi.sverto_core.TransactionListItem
import java.math.BigDecimal

private const val TAG = "CreateGroupVM"
private const val SEARCH_DEBOUNCE_MS = 300L

class CreateTransactionGroupViewModel(
    private val store: AppStore,
) : ViewModel() {
    private var editGroupId: String? = null
    private var initialized = false

    private val _formState = MutableStateFlow(GroupFormState())
    val formState: StateFlow<GroupFormState> = _formState.asStateFlow()

    private val _categoryResults = MutableStateFlow<List<CategoryItem>>(emptyList())
    val categoryResults: StateFlow<List<CategoryItem>> = _categoryResults.asStateFlow()

    private val _submitState = MutableStateFlow(GroupSubmitState.IDLE)
    val submitState: StateFlow<GroupSubmitState> = _submitState.asStateFlow()

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

    private var categorySearchJob: Job? = null

    fun init() {
        if (initialized) return
        initialized = true
        editGroupId = null
        _submitState.value = GroupSubmitState.IDLE
        _errorMessage.value = null
        _categoryResults.value = emptyList()
        _isLoading.value = false
        _formState.value = GroupFormState(date = System.currentTimeMillis() / 1000)
    }

    fun initForEdit(group: TransactionListItem) {
        if (initialized) return
        initialized = true
        editGroupId = group.id
        _submitState.value = GroupSubmitState.IDLE
        _errorMessage.value = null
        _categoryResults.value = emptyList()
        _isLoading.value = true

        _formState.value =
            GroupFormState(
                date = group.date,
                description = group.description,
                categoryId = group.categoryId,
                categoryName = group.categoryName,
            )

        viewModelScope.launch(Dispatchers.IO) {
            try {
                val items =
                    group.children
                        .map { child ->
                            async {
                                val editable = store.getEditableTransaction(child.id)
                                val config = getTransactionTypeConfig(apiTypeToConfigKey(editable.typeKey))
                                GroupTransactionItem(
                                    input =
                                        CreateTransactionInput(
                                            transactionId = child.id,
                                            typeKey = editable.typeKey,
                                            date = editable.date,
                                            primaryEntryId = editable.primaryEntryId,
                                            primaryAccountId = editable.primaryAccountId,
                                            primaryAssetId = editable.primaryAssetId,
                                            primaryAmount = editable.primaryAmount,
                                            secondaryEntryId = editable.secondaryEntryId,
                                            secondaryAccountId = editable.secondaryAccountId,
                                            secondaryAssetId = editable.secondaryAssetId,
                                            secondaryAmount = editable.secondaryAmount,
                                            originAssetId = editable.originAssetId,
                                            categoryId = editable.categoryId,
                                            description = editable.description.ifBlank { null },
                                        ),
                                    descriptionDisplay = editable.description.ifBlank { config.label },
                                    typeLabel = config.label,
                                    amountDisplay =
                                        BigDecimal
                                            .valueOf(editable.primaryAmount)
                                            .stripTrailingZeros()
                                            .toPlainString(),
                                    accountName = editable.primaryAccountName,
                                    assetDisplay = editable.primaryAssetDisplay,
                                    categoryName = editable.categoryName,
                                )
                            }
                        }.awaitAll()
                _formState.value = _formState.value.copy(transactions = items)
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

    fun initFromProposal(quickUploadId: String) {
        if (initialized) return
        initialized = true
        editGroupId = null
        _submitState.value = GroupSubmitState.IDLE
        _errorMessage.value = null
        _categoryResults.value = emptyList()
        _isLoading.value = true

        viewModelScope.launch(Dispatchers.IO) {
            try {
                val detail = store.getQuickUploadDetail(quickUploadId)
                val formState = proposalToGroupFormState(
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
                if (detail.proposalType != null && detail.proposalType != "transaction_group") {
                    _correctionState.value = CorrectionState.IDLE
                    _correctionTypeChange.value = CorrectionTypeChange(uploadId, detail.proposalType!!)
                    return@launch
                }
                _formState.value = proposalToGroupFormState(
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

    fun addTransaction(item: GroupTransactionItem) {
        _formState.value =
            _formState.value.copy(
                transactions = _formState.value.transactions + item,
            )
    }

    fun updateTransaction(
        index: Int,
        item: GroupTransactionItem,
    ) {
        val updated = _formState.value.transactions.toMutableList()
        if (index in updated.indices) {
            updated[index] = item
            _formState.value = _formState.value.copy(transactions = updated)
        }
    }

    fun removeTransaction(index: Int) {
        val updated = _formState.value.transactions.toMutableList()
        if (index in updated.indices) {
            updated.removeAt(index)
            _formState.value = _formState.value.copy(transactions = updated)
        }
    }

    fun submit() {
        val state = _formState.value
        val validationError =
            when {
                state.date == null -> "Date is required"
                state.categoryId == null -> "Category is required"
                state.transactions.isEmpty() -> "Add at least one transaction"
                state.description.isBlank() -> "Description is required"
                else -> null
            }
        if (validationError != null) {
            _errorMessage.value = validationError
            return
        }

        _submitState.value = GroupSubmitState.SUBMITTING
        _errorMessage.value = null

        val input =
            CreateTransactionGroupInput(
                date = state.date!!,
                description = state.description,
                categoryId = state.categoryId!!,
                transactions = state.transactions.map { it.input },
            )

        viewModelScope.launch(Dispatchers.IO) {
            try {
                val groupId = editGroupId
                if (groupId == null) {
                    store.createTransactionGroup(input)
                } else {
                    store.updateTransactionGroup(groupId, input)
                }
                val qId = _quickUploadId.value
                if (qId != null) {
                    store.completeQuickUpload(qId, true)
                    _quickUploadId.value = null
                }
                _submitState.value = GroupSubmitState.SUCCESS
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e(TAG, "Submit failed", e)
                _errorMessage.value = e.message ?: "Unknown error"
                _submitState.value = GroupSubmitState.IDLE
            }
        }
    }
}
