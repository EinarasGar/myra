package com.sverto.app.feature.transactions

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.ClerkResult
import com.sverto.app.BuildConfig
import com.sverto.app.core.state.UiState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.ApiClient
import uniffi.sverto_core.TransactionListItem

data class TransactionsUiModel(
    val userId: String,
    val transactions: List<TransactionListItem>,
    val hasMore: Boolean,
    val nextCursor: String?,
    val totalResults: Long?,
)

class TransactionsViewModel(
    private val apiClient: ApiClient,
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<TransactionsUiModel>>(UiState.Loading)
    val uiState: StateFlow<UiState<TransactionsUiModel>> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _isLoadingMore = MutableStateFlow(false)
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore.asStateFlow()

    init {
        load()
    }

    private suspend fun refreshAuthToken() {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) return
        when (val result = Clerk.auth.getToken()) {
            is ClerkResult.Success -> apiClient.setAuthToken(result.value)
            is ClerkResult.Failure -> Log.e("TransactionsVM", "Failed to get token: ${result.error}")
        }
    }

    fun load() {
        viewModelScope.launch(Dispatchers.IO) {
            val cached = loadFromCache()
            if (cached != null) {
                _uiState.value = UiState.Success(cached)
            } else {
                _uiState.value = UiState.Loading
            }

            try {
                refreshAuthToken()
                val authMe = apiClient.getMe()
                val page = apiClient.getTransactions(authMe.userId, PAGE_SIZE, null)
                _uiState.value =
                    UiState.Success(
                        TransactionsUiModel(
                            userId = authMe.userId,
                            transactions = page.items,
                            hasMore = page.hasMore,
                            nextCursor = page.nextCursor,
                            totalResults = page.totalResults,
                        ),
                    )
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e("TransactionsVM", "Failed to load", e)
                if (_uiState.value is UiState.Loading) {
                    _uiState.value = UiState.Error(e.message ?: "Unknown error")
                }
            }
        }
    }

    fun loadMore() {
        val current = (_uiState.value as? UiState.Success)?.data ?: return
        if (!current.hasMore || _isLoadingMore.value) return

        _isLoadingMore.value = true
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val page = apiClient.getTransactions(current.userId, PAGE_SIZE, current.nextCursor)
                _uiState.value =
                    UiState.Success(
                        current.copy(
                            transactions = current.transactions + page.items,
                            hasMore = page.hasMore,
                            nextCursor = page.nextCursor,
                            totalResults = page.totalResults,
                        ),
                    )
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e("TransactionsVM", "Failed to load more", e)
            } finally {
                _isLoadingMore.value = false
            }
        }
    }

    fun refresh() {
        val current = (_uiState.value as? UiState.Success)?.data ?: return
        _isRefreshing.value = true
        apiClient.clearCache()
        viewModelScope.launch(Dispatchers.IO) {
            try {
                refreshAuthToken()
                val page = apiClient.getTransactions(current.userId, PAGE_SIZE, null)
                _uiState.value =
                    UiState.Success(
                        current.copy(
                            transactions = page.items,
                            hasMore = page.hasMore,
                            nextCursor = page.nextCursor,
                            totalResults = page.totalResults,
                        ),
                    )
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e("TransactionsVM", "Failed to refresh", e)
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun deleteTransaction(
        transactionId: String,
        onSuccess: () -> Unit,
    ) {
        val current = (_uiState.value as? UiState.Success)?.data ?: return
        viewModelScope.launch(Dispatchers.IO) {
            try {
                refreshAuthToken()
                apiClient.deleteIndividualTransaction(current.userId, transactionId)
                refresh()
                onSuccess()
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e("TransactionsVM", "Failed to delete", e)
            }
        }
    }

    fun deleteTransactionGroup(
        groupId: String,
        onSuccess: () -> Unit,
    ) {
        val current = (_uiState.value as? UiState.Success)?.data ?: return
        viewModelScope.launch(Dispatchers.IO) {
            try {
                refreshAuthToken()
                apiClient.deleteTransactionGroup(current.userId, groupId)
                refresh()
                onSuccess()
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e("TransactionsVM", "Failed to delete group", e)
            }
        }
    }

    @Suppress("ReturnCount")
    private fun loadFromCache(): TransactionsUiModel? {
        val authMe = apiClient.getCachedMe() ?: return null
        val page = apiClient.getCachedTransactions(authMe.userId, PAGE_SIZE, null) ?: return null
        return TransactionsUiModel(
            userId = authMe.userId,
            transactions = page.items,
            hasMore = page.hasMore,
            nextCursor = page.nextCursor,
            totalResults = page.totalResults,
        )
    }

    companion object {
        private const val PAGE_SIZE: UInt = 25u
    }
}
