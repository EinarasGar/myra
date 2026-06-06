package com.sverto.app.feature.aichat

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import uniffi.sverto_core.MessagePart
import java.io.File

@Composable
fun AiChatScreen(
    viewModel: AiChatViewModel,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    val photoLauncher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.PickMultipleVisualMedia(),
        ) { uris ->
            viewModel.addSelectedFiles(uris)
        }
    val fileLauncher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.OpenMultipleDocuments(),
        ) { uris ->
            viewModel.addSelectedFiles(uris)
        }
    var cameraImageUri by remember { mutableStateOf<Uri?>(null) }
    val cameraLauncher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicture(),
        ) { success ->
            if (success) cameraImageUri?.let { viewModel.addSelectedFiles(listOf(it)) }
        }
    var showAttachmentSheet by remember { mutableStateOf(false) }

    if (showAttachmentSheet) {
        AttachmentSheet(
            onDismiss = { showAttachmentSheet = false },
            onPhotos = {
                showAttachmentSheet = false
                photoLauncher.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                )
            },
            onCamera = {
                showAttachmentSheet = false
                val uri = createCameraImageUri(context)
                cameraImageUri = uri
                cameraLauncher.launch(uri)
            },
            onFiles = {
                showAttachmentSheet = false
                // Types Myra can read: images + documents (pdf, txt, csv, html, md, xml, ...).
                fileLauncher.launch(arrayOf("image/*", "application/pdf", "text/*"))
            },
        )
    }

    val state by viewModel.uiState.collectAsState()
    val contentResolver = context.contentResolver
    val listState = rememberLazyListState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error) {
        state.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    // Re-fire on the last message's text length too: streaming deltas mutate the last message in
    // place, so the list size alone won't keep a long growing reply pinned to the bottom.
    val lastMessageLength =
        (
            state.messages
                .lastOrNull()
                ?.parts
                ?.lastOrNull() as? MessagePart.Text
        )?.content
            ?.length ?: 0
    LaunchedEffect(state.messages.size, lastMessageLength) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.size - 1)
        }
    }

    // imePadding shrinks the chat area above the keyboard (instead of the window panning), so the
    // top bar stays put and the floating composer rises above the keyboard with a gap.
    Box(modifier = modifier.fillMaxSize().imePadding()) {
        if (state.messages.isEmpty() && !state.isStreaming) {
            SuggestionChips(
                onSuggestion = { suggestion ->
                    // Fill the prompt and send it right away (conversation is created on send).
                    viewModel.setInputText(suggestion)
                    viewModel.sendMessage(contentResolver)
                },
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            LazyColumn(
                state = listState,
                // Bottom padding leaves room for the floating composer so the last message can
                // scroll clear of it.
                contentPadding = PaddingValues(start = 14.dp, top = 14.dp, end = 14.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                itemsIndexed(
                    items = state.messages,
                    key = { index, _ -> "msg-$index" },
                ) { index, message ->
                    ChatMessageBubble(
                        message = message,
                        isStreaming = state.isStreaming,
                        isLastMessage = index == state.messages.lastIndex,
                        modifier = Modifier.animateItem(),
                    )
                }

                // Working dots whenever a reply is in flight and the bottom isn't live streaming
                // text (e.g. before the first token, or between/after tool calls). When the last
                // part is streaming text, its caret already signals activity.
                val last = state.messages.lastOrNull()
                val streamingText =
                    last?.role == "assistant" &&
                        last.parts.lastOrNull() is MessagePart.Text
                if (state.isStreaming && !streamingText) {
                    item(key = "working") {
                        WorkingDots()
                    }
                }

                // Pending tool approval appears inline as the latest item in the thread.
                if (state.pendingApprovalCallId != null) {
                    val pendingTool =
                        state.messages
                            .flatMap { it.parts }
                            .filterIsInstance<MessagePart.ToolCall>()
                            .find { it.state == "approval-requested" }
                    if (pendingTool != null) {
                        item(key = "approval") {
                            ToolApprovalCard(
                                toolName = pendingTool.name,
                                params = pendingTool.params,
                                onApprove = { viewModel.approveTool(true) },
                                onDeny = { viewModel.approveTool(false) },
                            )
                        }
                    }
                }
            }
        }

        // Floating bottom area: snackbar, rate-limit banner, then the composer — overlaid on the
        // message list so content scrolls behind it.
        Column(
            modifier =
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth(),
        ) {
            SnackbarHost(
                hostState = snackbarHostState,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp),
            )

            state.rateLimit?.let { info ->
                RateLimitBanner(
                    info = info,
                    onDismiss = { viewModel.clearRateLimit() },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }

            MessageInputBar(
                text = state.inputText,
                onTextChange = { viewModel.setInputText(it) },
                isStreaming = state.isStreaming,
                onSend = { viewModel.sendMessage(contentResolver) },
                onStop = { viewModel.cancelStream() },
                onAddAttachment = { showAttachmentSheet = true },
                hasAttachments = state.selectedFileUris.isNotEmpty(),
                selectedFileUris = state.selectedFileUris,
                onRemoveAttachment = { uri -> viewModel.removeSelectedFile(uri) },
            )
        }
    }
}

/** Create a FileProvider content uri for the camera app to write a captured photo into. */
private fun createCameraImageUri(context: android.content.Context): Uri {
    val dir = File(context.cacheDir, "images").apply { mkdirs() }
    val file = File.createTempFile("camera_", ".jpg", dir)
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}
