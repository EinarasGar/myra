package com.sverto.app.feature.aichat

import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AiChatObserver
import uniffi.sverto_core.ApiException
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.ChatMessage
import uniffi.sverto_core.ChatStreamEvent
import uniffi.sverto_core.MessagePart

class AiChatViewModel(
    private val store: AppStore,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AiChatUiState())
    val uiState: StateFlow<AiChatUiState> = _uiState.asStateFlow()

    private val handler = Handler(Looper.getMainLooper())

    private val observer =
        object : AiChatObserver {
            override fun onConversationsChanged(conversations: List<uniffi.sverto_core.ConversationItem>) {
                handler.post { _uiState.update { it.copy(conversations = conversations) } }
            }

            override fun onMessagesChanged(
                conversationId: String,
                messages: List<ChatMessage>,
            ) {
                // Derive the pending approval from the loaded messages so a conversation reloaded while
                // awaiting approval shows the approval card again (its tool call is "approval-requested").
                val pendingCallId =
                    messages
                        .flatMap { it.parts }
                        .filterIsInstance<MessagePart.ToolCall>()
                        .firstOrNull { it.state == "approval-requested" }
                        ?.callId
                handler.post {
                    _uiState.update {
                        it.copy(
                            activeConversationId = conversationId,
                            messages = messages,
                            isStreaming = false,
                            pendingApprovalCallId = pendingCallId,
                            error = null,
                        )
                    }
                }
            }

            override fun onStreamEvent(
                conversationId: String,
                event: ChatStreamEvent,
            ) {
                handler.post { applyStreamEvent(event) }
            }
        }

    init {
        store.observeAiChat(observer)
        loadConversations()
    }

    fun loadConversations() {
        viewModelScope.launch {
            try {
                store.loadConversations()
            } catch (e: ApiException) {
                Log.w("AiChatViewModel", "Failed to load conversations", e)
            }
        }
    }

    fun selectConversation(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(messages = emptyList(), activeConversationId = id) }
            try {
                store.loadMessages(id)
            } catch (e: ApiException) {
                Log.e("AiChatViewModel", "Failed to load messages", e)
                _uiState.update { it.copy(error = "Failed to load conversation") }
            }
        }
    }

    /**
     * Start a fresh chat. The server conversation is created lazily on the first send (see
     * [sendMessage]), so this just resets to the empty state — switching the view off whatever
     * conversation was open and avoiding empty placeholder conversations in the list.
     */
    fun startNewConversation() {
        _uiState.update {
            it.copy(
                activeConversationId = null,
                messages = emptyList(),
                inputText = "",
                selectedFileUris = emptyList(),
                pendingApprovalCallId = null,
                isStreaming = false,
                error = null,
                rateLimit = null,
            )
        }
    }

    fun deleteConversation(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(messages = emptyList(), activeConversationId = null) }
            try {
                store.deleteConversation(id)
            } catch (e: ApiException) {
                Log.e("AiChatViewModel", "Failed to delete conversation", e)
            }
        }
    }

    fun setInputText(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun addSelectedFiles(uris: List<Uri>) {
        if (uris.isEmpty()) return
        _uiState.update { it.copy(selectedFileUris = it.selectedFileUris + uris) }
    }

    fun removeSelectedFile(uri: Uri) {
        _uiState.update { it.copy(selectedFileUris = it.selectedFileUris - uri) }
    }

    fun sendMessage(contentResolver: android.content.ContentResolver) {
        val state = _uiState.value
        val text = state.inputText.trim()
        if (text.isEmpty() && state.selectedFileUris.isEmpty()) return

        val convId = state.activeConversationId

        if (convId == null) {
            // Auto-create conversation first, then send
            viewModelScope.launch {
                try {
                    val newId = store.createConversation()
                    doSendMessage(newId, text, state.selectedFileUris, contentResolver)
                } catch (e: ApiException) {
                    Log.e("AiChatViewModel", "Failed to create conversation for message", e)
                    _uiState.update { it.copy(error = "Failed to create conversation: ${e.message}") }
                }
            }
            return
        }

        doSendMessage(convId, text, state.selectedFileUris, contentResolver)
    }

    // Broad catches are intentional: per-file upload is best-effort (skip a file on any IO/parse
    // failure) and the outer block surfaces any send failure to the UI as an error state.
    @Suppress("TooGenericExceptionCaught")
    private fun doSendMessage(
        convId: String,
        text: String,
        fileUris: List<Uri>,
        contentResolver: android.content.ContentResolver,
    ) {
        // Echo the user's message immediately. The local content:// uri is shown until the final
        // server reload replaces it with the persisted attachment. Listing it last (as a "user"
        // turn) also gives applyStreamEvent a clean boundary so the reply starts a new bubble.
        val userParts =
            buildList {
                fileUris.forEach { uri ->
                    val mime = contentResolver.getType(uri) ?: "application/octet-stream"
                    add(MessagePart.File(fileId = "", mediaType = mime, url = uri.toString()))
                }
                if (text.isNotEmpty()) {
                    add(MessagePart.Text(text))
                }
            }
        _uiState.update {
            it.copy(
                // Mark this conversation active so subsequent messages stay in it. (Previously the
                // post-stream server reload set this; we now set it explicitly on send.)
                activeConversationId = convId,
                messages = it.messages + ChatMessage("user", userParts),
                inputText = "",
                selectedFileUris = emptyList(),
                isStreaming = true,
                error = null,
                rateLimit = null,
            )
        }

        viewModelScope.launch {
            try {
                val fileIds = mutableListOf<String>()
                for (uri in fileUris) {
                    try {
                        val fileId =
                            withContext(Dispatchers.IO) {
                                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                                val inputStream = contentResolver.openInputStream(uri)
                                val bytes = inputStream?.readBytes()
                                inputStream?.close()
                                if (bytes != null) {
                                    val fileName = uri.lastPathSegment ?: "image.jpg"
                                    store.uploadChatFile(bytes, mimeType, fileName)
                                } else {
                                    null
                                }
                            }
                        if (fileId != null) {
                            fileIds.add(fileId)
                        }
                    } catch (e: Exception) {
                        Log.w("AiChatViewModel", "Failed to upload file", e)
                    }
                }

                store.sendMessage(convId, text, fileIds)
            } catch (e: Exception) {
                Log.e("AiChatViewModel", "Failed to send message", e)
                _uiState.update {
                    it.copy(
                        isStreaming = false,
                        error = e.message ?: "Failed to send message",
                    )
                }
            }
        }
    }

    fun approveTool(approved: Boolean) {
        val state = _uiState.value
        val convId = state.activeConversationId ?: return
        val callId = state.pendingApprovalCallId ?: return

        // Move the pending tool out of "approval-requested" so the streamed result can attach to it
        // (approved -> executing; denied -> terminal denied state).
        val newToolState = if (approved) "input-available" else "output-denied"
        val updatedMessages =
            state.messages.map { msg ->
                if (msg.role != "assistant") {
                    msg
                } else {
                    msg.copy(
                        parts =
                            msg.parts.map { part ->
                                if (part is MessagePart.ToolCall && part.callId == callId) {
                                    part.copy(state = newToolState)
                                } else {
                                    part
                                }
                            },
                    )
                }
            }

        _uiState.update {
            it.copy(
                messages = updatedMessages,
                isStreaming = true,
                pendingApprovalCallId = null,
            )
        }

        viewModelScope.launch {
            try {
                store.approveTool(convId, callId, approved)
            } catch (e: ApiException) {
                _uiState.update {
                    it.copy(
                        isStreaming = false,
                        error = e.message ?: "Approval failed",
                    )
                }
            }
        }
    }

    fun cancelStream() {
        store.cancelStream()
        _uiState.update {
            it.copy(isStreaming = false, pendingApprovalCallId = null)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearRateLimit() {
        _uiState.update { it.copy(rateLimit = null) }
    }

    private fun applyStreamEvent(event: ChatStreamEvent) {
        _uiState.update { state ->
            val messages = state.messages.toMutableList()
            val lastMsg = messages.lastOrNull()
            // Only continue the current assistant turn. If the last message is the user's (just
            // echoed) message, start fresh parts so the reply becomes its own bubble.
            val lastParts =
                if (lastMsg != null && lastMsg.role == "assistant") {
                    lastMsg.parts.toMutableList()
                } else {
                    mutableListOf()
                }

            fun commitAssistantParts() {
                if (lastMsg != null && lastMsg.role == "assistant") {
                    messages[messages.lastIndex] = ChatMessage("assistant", lastParts)
                } else {
                    messages.add(ChatMessage("assistant", lastParts))
                }
            }

            when (event) {
                is ChatStreamEvent.TextDelta -> {
                    val existingText = lastParts.lastOrNull() as? MessagePart.Text
                    if (existingText != null) {
                        lastParts[lastParts.lastIndex] = MessagePart.Text(existingText.content + event.delta)
                    } else {
                        lastParts.add(MessagePart.Text(event.delta))
                    }
                }
                is ChatStreamEvent.ReasoningDelta -> {
                    val existingReasoning = lastParts.lastOrNull() as? MessagePart.Reasoning
                    if (existingReasoning != null) {
                        lastParts[lastParts.lastIndex] = MessagePart.Reasoning(existingReasoning.content + event.delta)
                    } else {
                        lastParts.add(MessagePart.Reasoning(event.delta))
                    }
                }
                is ChatStreamEvent.ToolCall -> {
                    lastParts.add(
                        MessagePart.ToolCall(
                            callId = event.callId,
                            name = event.name,
                            params = event.params,
                            state = "input-available",
                            output = null,
                        ),
                    )
                }
                is ChatStreamEvent.ToolResult -> {
                    val idx =
                        lastParts.indexOfLast { part ->
                            part is MessagePart.ToolCall &&
                                part.state != "approval-requested" &&
                                part.output == null
                        }
                    if (idx >= 0) {
                        val existing = lastParts[idx] as MessagePart.ToolCall
                        lastParts[idx] = existing.copy(state = "output-available", output = event.output)
                    }
                }
                is ChatStreamEvent.ToolApprovalRequired -> {
                    val idx =
                        lastParts.indexOfLast { part ->
                            part is MessagePart.ToolCall && part.callId == event.callId
                        }
                    if (idx >= 0) {
                        val existing = lastParts[idx] as MessagePart.ToolCall
                        lastParts[idx] = existing.copy(state = "approval-requested", output = null)
                    }
                    commitAssistantParts()
                    return@update state.copy(
                        messages = messages,
                        pendingApprovalCallId = event.callId,
                        isStreaming = false,
                    )
                }
                is ChatStreamEvent.Error -> {
                    lastParts.add(MessagePart.Text("Error: ${event.message}"))
                }
                is ChatStreamEvent.RateLimited -> {
                    return@update state.copy(
                        isStreaming = false,
                        rateLimit = RateLimitInfo(event.message, event.retryAfterSeconds),
                    )
                }
                is ChatStreamEvent.Done -> {
                    return@update state.copy(isStreaming = false)
                }
            }

            commitAssistantParts()
            state.copy(messages = messages)
        }
    }

    override fun onCleared() {
        store.unobserveAiChat()
    }
}
