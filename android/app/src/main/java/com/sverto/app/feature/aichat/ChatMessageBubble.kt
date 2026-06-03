package com.sverto.app.feature.aichat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mikepenz.markdown.coil3.Coil3ImageTransformerImpl
import com.mikepenz.markdown.m3.Markdown
import uniffi.sverto_core.ChatMessage
import uniffi.sverto_core.MessagePart

private val BubbleMaxWidth = 340.dp

@Composable
fun ChatMessageBubble(
    message: ChatMessage,
    modifier: Modifier = Modifier,
    isStreaming: Boolean = false,
    isLastMessage: Boolean = false,
) {
    val isUser = message.role == "user"

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        message.parts.forEachIndexed { index, part ->
            when (part) {
                is MessagePart.Text -> {
                    if (isUser) {
                        UserTextBubble(part.content)
                    } else {
                        // Caret only when this text is the very last part (i.e. live output);
                        // between/after tool calls the bottom "working" dots indicate activity.
                        val streamingThis =
                            isStreaming && isLastMessage && index == message.parts.lastIndex
                        AssistantText(part.content, streaming = streamingThis)
                    }
                }
                is MessagePart.Reasoning -> {
                    ReasoningCard(
                        content = part.content,
                        isStreaming = isStreaming && isLastMessage,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                is MessagePart.ToolCall -> {
                    ToolCallCard(
                        name = part.name,
                        params = part.params,
                        state = part.state,
                        output = part.output,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                is MessagePart.File -> {
                    AttachmentThumbnail(
                        url = part.url,
                        mediaType = part.mediaType,
                        modifier =
                            Modifier
                                .width(220.dp)
                                .height(160.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun AssistantText(
    content: String,
    streaming: Boolean,
) {
    // No bubble for assistant replies (Gemini-style) — just the text, full width, on the surface.
    Box(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp)) {
        if (streaming) {
            // Plain text + inline caret while tokens arrive — avoids flashing half-formed
            // markdown (e.g. an unterminated "**") and re-parsing on every delta.
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = content,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                StreamingCaret()
            }
        } else {
            Markdown(
                content = content,
                imageTransformer = Coil3ImageTransformerImpl,
            )
        }
    }
}

@Composable
private fun UserTextBubble(content: String) {
    Surface(
        shape = UserBubbleShape,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.widthIn(max = BubbleMaxWidth),
    ) {
        Text(
            text = content,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 11.dp),
        )
    }
}
