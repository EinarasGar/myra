package com.sverto.app.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.ExportFormat
import uniffi.sverto_core.LedgerExport

data class ExportDownload(
    val url: String,
    val fileName: String,
)

data class ExportsUiState(
    val exports: List<LedgerExport> = emptyList(),
    val loading: Boolean = false,
    val creating: Boolean = false,
    val error: String? = null,
    val download: ExportDownload? = null,
)

class ExportsViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ExportsUiState())
    val state: StateFlow<ExportsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val exports = store.listExports()
                _state.value = ExportsUiState(exports = exports, loading = false)
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(
                        loading = false,
                        error = e.message ?: "Failed to load exports",
                    )
            }
        }
    }

    fun createExport(format: ExportFormat) {
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = _state.value.copy(creating = true, error = null)
            try {
                store.createExport(format)
                val exports = store.listExports()
                _state.value =
                    ExportsUiState(
                        exports = exports,
                        loading = false,
                        creating = false,
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(
                        creating = false,
                        error = e.message ?: "Failed to create export",
                    )
            }
        }
    }

    fun fetchDownload(export: LedgerExport) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val url = store.getExportDownloadUrl(export.id)
                _state.value =
                    _state.value.copy(
                        download = ExportDownload(url = url, fileName = fileName(export)),
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                _state.value =
                    _state.value.copy(
                        error = e.message ?: "Failed to prepare download",
                    )
            }
        }
    }

    fun consumeDownload() {
        _state.value = _state.value.copy(download = null)
    }
}

private fun fileName(export: LedgerExport): String = "ledger-export-${export.id}.${extension(export.format)}"

private fun extension(format: ExportFormat): String =
    when (format) {
        ExportFormat.CSV -> "csv"
        ExportFormat.BEANCOUNT -> "beancount"
    }
