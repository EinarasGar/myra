package com.sverto.app.core.ai

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import uniffi.sverto_core.CategoryItem
import java.util.concurrent.atomic.AtomicInteger
import kotlin.coroutines.cancellation.CancellationException

class CategorySuggestionController(
    private val isAvailable: suspend () -> Boolean,
    private val loadCategories: suspend () -> List<CategoryItem>,
    private val suggest: suspend (String, List<CategoryItem>) -> CategoryItem?,
) {
    private val _state = MutableStateFlow<SuggestionState>(SuggestionState.Idle)
    val state: StateFlow<SuggestionState> = _state.asStateFlow()

    @Volatile
    private var lastCommittedText: String? = null
    private val generation = AtomicInteger(0)

    fun onDescriptionChanged(text: String) {
        if (_state.value is SuggestionState.Suggested && text.trim() != lastCommittedText) {
            _state.value = SuggestionState.Idle
        }
    }

    fun markCommitted(text: String) {
        lastCommittedText = text.trim().takeIf { it.isNotEmpty() }
        generation.incrementAndGet()
        _state.value = SuggestionState.Idle
    }

    suspend fun suggestFor(description: String): CategoryItem? {
        val text = description.trim()
        if (text.isEmpty() || text == lastCommittedText) return null
        if (!isAvailable()) return null
        lastCommittedText = text
        _state.value = SuggestionState.Loading
        val current = generation.incrementAndGet()
        return try {
            val categories = loadCategories()
            val result = if (categories.isEmpty()) null else suggest(text, categories)
            if (generation.get() == current) result else null
        } catch (e: CancellationException) {
            throw e
        } catch (
            @Suppress("TooGenericExceptionCaught") ignored: Exception,
        ) {
            if (lastCommittedText == text) {
                lastCommittedText = null
            }
            null
        } finally {
            if (generation.get() == current) {
                _state.value = SuggestionState.Idle
            }
        }
    }

    fun offer(category: CategoryItem) {
        _state.value = SuggestionState.Suggested(category)
    }

    fun takeSuggestion(): CategoryItem? {
        val current = _state.value as? SuggestionState.Suggested ?: return null
        _state.value = SuggestionState.Idle
        return current.category
    }

    fun reset() {
        generation.incrementAndGet()
        _state.value = SuggestionState.Idle
    }
}
