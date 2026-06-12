package com.sverto.app.core

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.ApiException

/**
 * A user-facing message for a thrown error. The UniFFI-generated [ApiException.message]
 * is "reason=…, status=…"; surface just the server's reason instead.
 */
fun Throwable.friendlyMessage(): String =
    when (this) {
        is ApiException.Server -> reason
        is ApiException.Network -> reason
        is ApiException.Timeout -> reason
        is ApiException.Parse -> reason
        else -> message ?: "Something went wrong"
    }

/**
 * Runs [block] on IO, emitting a user-facing message into [errors]
 * (the screen's snackbar flow) when an API call fails.
 */
fun ViewModel.launchCatching(
    errors: MutableSharedFlow<String>,
    block: suspend () -> Unit,
) {
    viewModelScope.launch(Dispatchers.IO) {
        try {
            block()
        } catch (e: ApiException) {
            errors.emit(e.friendlyMessage())
        }
    }
}
