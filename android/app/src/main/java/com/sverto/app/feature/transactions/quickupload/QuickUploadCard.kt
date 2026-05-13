package com.sverto.app.feature.transactions.quickupload

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlin.math.abs

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun QuickUploadCard(
    item: QuickUploadUiItem,
    onClick: () -> Unit,
    onRetry: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isClickable = item.status == QuickUploadStatus.READY
    val a11yDescription = when (item.status) {
        QuickUploadStatus.QUEUED -> "Quick upload, waiting for connection"
        QuickUploadStatus.UPLOADING -> "Quick upload, uploading"
        QuickUploadStatus.PROCESSING -> "Quick upload, processing"
        QuickUploadStatus.READY -> "Quick upload ready, ${item.proposalSummary?.description ?: "receipt"}"
        QuickUploadStatus.FAILED -> "Quick upload failed"
    }

    ElevatedCard(
        onClick = { if (isClickable) onClick() },
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = a11yDescription },
        shape = RoundedCornerShape(16.dp),
        enabled = isClickable,
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            StatusBadge(item.status)

            Spacer(Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                if (item.thumbnailBytes != null) {
                    val bitmap = android.graphics.BitmapFactory.decodeByteArray(
                        item.thumbnailBytes, 0, item.thumbnailBytes.size
                    )
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap.asImageBitmap(),
                            contentDescription = null,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(10.dp)),
                        )
                    }
                } else {
                    Icon(
                        imageVector = Icons.Outlined.Receipt,
                        contentDescription = null,
                        modifier = Modifier.size(44.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Spacer(Modifier.width(10.dp))

                Column(modifier = Modifier.weight(1f)) {
                    when (item.status) {
                        QuickUploadStatus.QUEUED -> {
                            Text("Receipt photo", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "Queued • Will upload when online",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        QuickUploadStatus.UPLOADING -> {
                            Text("Uploading…", style = MaterialTheme.typography.bodyMedium)
                        }
                        QuickUploadStatus.PROCESSING -> {
                            Text("Analyzing…", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "AI is extracting transaction details",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        QuickUploadStatus.READY -> {
                            val summary = item.proposalSummary
                            Text(
                                summary?.description ?: "Receipt",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            if (!summary?.date.isNullOrEmpty()) {
                                Text(
                                    summary!!.date,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        QuickUploadStatus.FAILED -> {
                            Text("Processing failed", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                item.errorMessage ?: "Unknown error",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error,
                            )
                        }
                    }
                }

                if (item.status == QuickUploadStatus.READY && item.proposalSummary?.amount != null) {
                    Text(
                        text = formatAmount(item.proposalSummary.amount),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }

            if (item.status == QuickUploadStatus.UPLOADING) {
                Spacer(Modifier.height(10.dp))
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (item.status == QuickUploadStatus.PROCESSING) {
                Spacer(Modifier.height(10.dp))
                LoadingIndicator(modifier = Modifier.size(24.dp))
            }

            if (item.status == QuickUploadStatus.FAILED) {
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    FilledTonalButton(onClick = onRetry) { Text("Retry") }
                    Spacer(Modifier.width(8.dp))
                    TextButton(onClick = onDismiss) { Text("Dismiss") }
                }
            }
            if (item.status == QuickUploadStatus.READY) {
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Discard") }
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: QuickUploadStatus) {
    val (text, color, icon) = when (status) {
        QuickUploadStatus.QUEUED -> Triple(
            "Waiting for connection",
            MaterialTheme.colorScheme.secondaryContainer,
            Icons.Outlined.CloudOff,
        )
        QuickUploadStatus.UPLOADING -> Triple(
            "Uploading…",
            MaterialTheme.colorScheme.primaryContainer,
            null,
        )
        QuickUploadStatus.PROCESSING -> Triple(
            "Reading receipt…",
            MaterialTheme.colorScheme.primaryContainer,
            null,
        )
        QuickUploadStatus.READY -> Triple(
            "Ready to review",
            MaterialTheme.colorScheme.tertiaryContainer,
            null,
        )
        QuickUploadStatus.FAILED -> Triple(
            "Failed",
            MaterialTheme.colorScheme.errorContainer,
            Icons.Outlined.ErrorOutline,
        )
    }

    Surface(
        shape = RoundedCornerShape(50),
        color = color,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.width(4.dp))
            }
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }
}

private fun formatAmount(amount: String): String {
    val value = amount.toDoubleOrNull() ?: return amount
    val prefix = if (value < 0) "-" else "+"
    return "$prefix\$${String.format("%.2f", abs(value))}"
}
