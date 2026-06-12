package com.sverto.app.feature.assets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.AssetSummary

private const val PAGE_SIZE = 25
private const val SEARCH_DEBOUNCE_MS = 300L

data class MarketsState(
    val query: String = "",
    val items: List<AssetSummary> = emptyList(),
    val total: Int = 0,
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
)

class MarketsListViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(MarketsState())
    val state = _state.asStateFlow()

    private var searchJob: Job? = null

    /** Lazily runs the initial empty-query search the first time the search bar expands. */
    fun onSearchExpanded() {
        if (searchJob == null) search(_state.value.query, debounce = false)
    }

    fun onQueryChange(query: String) {
        if (query == _state.value.query) return
        _state.value = _state.value.copy(query = query)
        search(query, debounce = true)
    }

    private fun search(
        query: String,
        debounce: Boolean,
    ) {
        searchJob?.cancel()
        searchJob =
            viewModelScope.launch(Dispatchers.IO) {
                if (debounce) delay(SEARCH_DEBOUNCE_MS)
                _state.value = _state.value.copy(isLoading = true)
                try {
                    val page = store.searchGlobalAssets(query, 0, PAGE_SIZE)
                    _state.value =
                        _state.value.copy(
                            items = page.items,
                            total = page.total,
                            isLoading = false,
                        )
                } catch (e: CancellationException) {
                    throw e
                } catch (
                    @Suppress("TooGenericExceptionCaught") _: Exception,
                ) {
                    _state.value = _state.value.copy(isLoading = false)
                }
            }
    }

    fun loadMore() {
        val s = _state.value
        if (s.isLoadingMore || s.items.size >= s.total) return
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = s.copy(isLoadingMore = true)
            try {
                val page = store.searchGlobalAssets(s.query, s.items.size, PAGE_SIZE)
                _state.value =
                    _state.value.copy(
                        items = _state.value.items + page.items,
                        total = page.total,
                        isLoadingMore = false,
                    )
            } catch (
                @Suppress("TooGenericExceptionCaught") _: Exception,
            ) {
                _state.value = _state.value.copy(isLoadingMore = false)
            }
        }
    }
}
