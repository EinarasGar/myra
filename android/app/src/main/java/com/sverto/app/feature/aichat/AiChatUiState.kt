package com.sverto.app.feature.aichat

import uniffi.sverto_core.ChatMessage
import uniffi.sverto_core.ConversationItem

data class AiChatUiState(
    val conversations: List<ConversationItem> = emptyList(),
    val activeConversationId: String? = null,
    val messages: List<ChatMessage> = emptyList(),
    val isStreaming: Boolean = false,
    val inputText: String = "",
    val selectedFileUris: List<android.net.Uri> = emptyList(),
    val pendingApprovalCallId: String? = null,
    val error: String? = null,
    val rateLimit: RateLimitInfo? = null,
)

data class RateLimitInfo(
    val message: String,
    val retryAfterSeconds: Long?,
)
