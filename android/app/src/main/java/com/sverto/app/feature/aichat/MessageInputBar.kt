package com.sverto.app.feature.aichat

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

@Composable
fun MessageInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    isStreaming: Boolean,
    onSend: () -> Unit,
    onStop: () -> Unit,
    onAddAttachment: () -> Unit,
    hasAttachments: Boolean,
    modifier: Modifier = Modifier,
    selectedFileUris: List<Uri> = emptyList(),
    onRemoveAttachment: (Uri) -> Unit = {},
) {
    // Floating composer: no solid bar — a subtle gradient scrim lets the list fade out behind the
    // rounded pill (Gemini-style) instead of a hard divider.
    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, MaterialTheme.colorScheme.surface),
                    ),
                ).padding(start = 12.dp, end = 12.dp, top = 24.dp, bottom = 12.dp),
    ) {
        if (selectedFileUris.isNotEmpty()) {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(start = 4.dp, bottom = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                for (uri in selectedFileUris) {
                    AttachmentChip(uri = uri, onRemove = { onRemoveAttachment(uri) })
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom,
        ) {
            OutlinedTextField(
                value = text,
                onValueChange = onTextChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Message AI…") },
                leadingIcon = {
                    IconButton(onClick = onAddAttachment) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add attachment",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                shape = RoundedCornerShape(28.dp),
                colors =
                    OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                        focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                    ),
                maxLines = 4,
            )

            Spacer(Modifier.width(8.dp))

            SendButton(
                isStreaming = isStreaming,
                enabled = text.isNotBlank() || hasAttachments,
                onSend = onSend,
                onStop = onStop,
            )
        }
    }
}

@Composable
private fun SendButton(
    isStreaming: Boolean,
    enabled: Boolean,
    onSend: () -> Unit,
    onStop: () -> Unit,
) {
    val active = isStreaming || enabled
    Surface(
        onClick = { if (isStreaming) onStop() else onSend() },
        enabled = active,
        shape = RoundedCornerShape(18.dp),
        color =
            if (active) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.surfaceContainerHighest
            },
        modifier = Modifier.size(52.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = if (isStreaming) Icons.Default.Stop else Icons.Default.ArrowUpward,
                contentDescription = if (isStreaming) "Stop generating" else "Send message",
                tint =
                    if (active) {
                        MaterialTheme.colorScheme.onPrimary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
            )
        }
    }
}

@Composable
private fun AttachmentChip(
    uri: Uri,
    onRemove: () -> Unit,
) {
    val context = LocalContext.current
    val isImage =
        remember(uri) {
            context.contentResolver.getType(uri)?.startsWith("image/") == true
        }
    Box(modifier = Modifier.padding(top = 6.dp, end = 6.dp)) {
        if (isImage) {
            AsyncImage(
                model = uri,
                contentDescription = "Selected image",
                contentScale = ContentScale.Crop,
                modifier =
                    Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(14.dp)),
            )
        } else {
            Box(
                modifier =
                    Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Description,
                    contentDescription = "Selected file",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(28.dp),
                )
            }
        }
        Surface(
            onClick = onRemove,
            shape = RoundedCornerShape(50),
            color = MaterialTheme.colorScheme.inverseSurface,
            modifier =
                Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 6.dp, y = (-6).dp)
                    .size(22.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Remove attachment",
                    tint = MaterialTheme.colorScheme.inverseOnSurface,
                    modifier = Modifier.size(14.dp),
                )
            }
        }
    }
}
