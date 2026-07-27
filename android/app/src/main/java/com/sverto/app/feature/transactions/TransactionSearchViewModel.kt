package com.sverto.app.feature.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sverto.app.core.friendlyMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.TransactionListItem

private const val SEARCH_DEBOUNCE_MS = 300L

data class TransactionSearchState(
    val query: String = "",
    val items: List<TransactionListItem> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = false,
    val error: String? = null,
)

class TransactionSearchViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(TransactionSearchState())
    val state = _state.asStateFlow()

    private var searchJob: Job? = null
    private var loadMoreJob: Job? = null
    private var nextCursor: String? = null

    fun onQueryChange(query: String) {
        if (query == _state.value.query) return

        searchJob?.cancel()
        loadMoreJob?.cancel()
        nextCursor = null

        if (query.isBlank()) {
            _state.value = TransactionSearchState(query = query)
            return
        }

        _state.value = TransactionSearchState(query = query, isLoading = true)

        searchJob =
            viewModelScope.launch(Dispatchers.IO) {
                try {
                    delay(SEARCH_DEBOUNCE_MS)
                    val page = store.searchTransactions(query, null)
                    if (_state.value.query != query) return@launch
                    nextCursor = page.nextCursor
                    _state.update {
                        it.copy(
                            items = page.items,
                            hasMore = page.hasMore,
                            isLoading = false,
                            error = null,
                        )
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (
                    @Suppress("TooGenericExceptionCaught") e: Exception,
                ) {
                    if (_state.value.query != query) return@launch
                    _state.update {
                        it.copy(isLoading = false, error = e.friendlyMessage())
                    }
                }
            }
    }

    fun loadMore() {
        val current = _state.value
        val cursor = nextCursor ?: return
        if (!current.hasMore || current.isLoading || current.isLoadingMore) return
        if (current.query.isBlank()) return

        loadMoreJob =
            viewModelScope.launch(Dispatchers.IO) {
                _state.update { if (it.query == current.query) it.copy(isLoadingMore = true) else it }
                try {
                    val page = store.searchTransactions(current.query, cursor)
                    if (_state.value.query != current.query) return@launch
                    nextCursor = page.nextCursor
                    _state.update {
                        it.copy(
                            items = it.items + page.items,
                            hasMore = page.hasMore,
                            isLoadingMore = false,
                        )
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (
                    @Suppress("TooGenericExceptionCaught") e: Exception,
                ) {
                    if (_state.value.query != current.query) return@launch
                    _state.update {
                        it.copy(isLoadingMore = false, error = e.friendlyMessage())
                    }
                }
            }
    }
}
