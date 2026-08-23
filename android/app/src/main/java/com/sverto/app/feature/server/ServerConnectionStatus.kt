package com.sverto.app.feature.server

import uniffi.sverto_core.ServerInfo

sealed interface ServerConnectionStatus {
    data object Idle : ServerConnectionStatus

    data class Checking(
        val url: String,
    ) : ServerConnectionStatus

    data class Found(
        val url: String,
        val serverInfo: ServerInfo,
    ) : ServerConnectionStatus

    data class Error(
        val url: String,
        val message: String,
    ) : ServerConnectionStatus
}
