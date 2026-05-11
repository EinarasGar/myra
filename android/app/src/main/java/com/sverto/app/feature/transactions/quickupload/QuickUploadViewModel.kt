package com.sverto.app.feature.transactions.quickupload

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.QuickUploadsObserver
import uniffi.sverto_core.QuickUploadsState

class QuickUploadViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _items = MutableStateFlow<List<QuickUploadUiItem>>(emptyList())
    val items: StateFlow<List<QuickUploadUiItem>> = _items.asStateFlow()

    private val observer = object : QuickUploadsObserver {
        override fun onQuickUploadsChanged(state: QuickUploadsState) {
            _items.value = state.items.map { item ->
                QuickUploadUiItem(
                    id = item.id,
                    isLocal = item.status in listOf("queued", "uploading"),
                    status = mapStatus(item.status),
                    thumbnailBytes = item.thumbnail,
                    proposalType = item.proposalType,
                    proposalSummary = parseProposalSummary(item.proposalData),
                    errorMessage = item.errorMessage,
                    createdAt = item.createdAt,
                )
            }
        }
    }

    init {
        store.observeQuickUploads(observer)
        viewModelScope.launch { store.refreshQuickUploads() }
    }

    fun queueUpload(imageData: ByteArray, thumbnail: ByteArray, mimeType: String) {
        store.queueQuickUpload(imageData, thumbnail, mimeType)
        viewModelScope.launch { store.refreshQuickUploads() }
    }

    fun refresh() {
        viewModelScope.launch { store.refreshQuickUploads() }
    }

    @Suppress("UNUSED_PARAMETER")
    fun retry(id: String) {
        viewModelScope.launch { store.refreshQuickUploads() }
    }

    fun cancel(id: String) {
        _items.value = _items.value.filter { it.id != id }
        viewModelScope.launch { store.dismissQuickUpload(id) }
    }

    fun dismiss(id: String) = cancel(id)

    fun onProposalCompleted(serverId: String) {
        _items.value = _items.value.filter { it.id != serverId }
        viewModelScope.launch { store.completeQuickUpload(serverId, true) }
    }

    override fun onCleared() {
        store.unobserveQuickUploads()
    }

    companion object {
        private fun mapStatus(status: String): QuickUploadStatus = when (status) {
            "queued" -> QuickUploadStatus.QUEUED
            "uploading" -> QuickUploadStatus.UPLOADING
            "pending", "created", "processing" -> QuickUploadStatus.PROCESSING
            "proposal_ready" -> QuickUploadStatus.READY
            "failed" -> QuickUploadStatus.FAILED
            else -> QuickUploadStatus.PROCESSING
        }
    }
}
