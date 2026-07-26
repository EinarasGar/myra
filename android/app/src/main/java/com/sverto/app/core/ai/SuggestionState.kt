package com.sverto.app.core.ai

import uniffi.sverto_core.CategoryItem

sealed interface SuggestionState {
    data object Idle : SuggestionState

    data object Loading : SuggestionState

    data class Suggested(
        val category: CategoryItem,
    ) : SuggestionState
}
