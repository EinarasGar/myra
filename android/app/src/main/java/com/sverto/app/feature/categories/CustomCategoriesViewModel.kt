package com.sverto.app.feature.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.ApiException
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.CategoriesObserver
import uniffi.sverto_core.CategoriesState

class CustomCategoriesViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state =
        MutableStateFlow(
            CategoriesState(
                isLoading = true,
                error = null,
                categories = emptyList(),
                types = emptyList(),
            ),
        )
    val state = _state.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors = _errors.asSharedFlow()

    private val observer =
        object : CategoriesObserver {
            override fun onCategoriesChanged(state: CategoriesState) {
                _state.value = state
            }
        }

    init {
        store.observeCategories(observer)
        load()
    }

    fun load() {
        viewModelScope.launch { store.loadCategories() }
    }

    fun refresh() {
        viewModelScope.launch { store.refreshCategories() }
    }

    fun createCategory(
        name: String,
        icon: String,
        typeId: Int,
    ) = launchCatching { store.createCategory(name, icon, typeId) }

    fun updateCategory(
        id: Int,
        name: String,
        icon: String,
        typeId: Int,
    ) = launchCatching { store.updateCategory(id, name, icon, typeId) }

    fun deleteCategory(id: Int) = launchCatching { store.deleteCategory(id) }

    fun createType(name: String) = launchCatching { store.createCategoryType(name) }

    fun updateType(
        id: Int,
        name: String,
    ) = launchCatching { store.updateCategoryType(id, name) }

    fun deleteType(id: Int) = launchCatching { store.deleteCategoryType(id) }

    private fun launchCatching(block: suspend () -> Unit) {
        viewModelScope.launch {
            try {
                block()
            } catch (e: ApiException) {
                _errors.emit(e.message ?: "Something went wrong")
            }
        }
    }

    override fun onCleared() {
        store.unobserveCategories()
    }
}
