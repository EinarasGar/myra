package com.sverto.app.feature.connectors

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialShapes
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.toShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.sverto.app.core.icons.LucideIcon
import java.util.Locale

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ProviderAvatar(
    icon: String,
    modifier: Modifier = Modifier,
    size: Dp = 48.dp,
    shape: Shape = MaterialShapes.Cookie9Sided.toShape(),
) {
    Box(
        modifier =
            modifier
                .size(size)
                .clip(shape)
                .background(MaterialTheme.colorScheme.primaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        LucideIcon(
            name = icon,
            tint = MaterialTheme.colorScheme.onPrimaryContainer,
            modifier = Modifier.size(size / 2),
        )
    }
}

private data class StatusVisual(
    val label: String,
    val container: Color,
    val content: Color,
)

@Composable
private fun statusVisual(status: String): StatusVisual =
    when (status) {
        "active" ->
            StatusVisual(
                "Active",
                MaterialTheme.colorScheme.secondaryContainer,
                MaterialTheme.colorScheme.onSecondaryContainer,
            )
        "pending", "pending_oauth" ->
            StatusVisual(
                "Pending",
                MaterialTheme.colorScheme.tertiaryContainer,
                MaterialTheme.colorScheme.onTertiaryContainer,
            )
        "error" ->
            StatusVisual(
                "Needs attention",
                MaterialTheme.colorScheme.errorContainer,
                MaterialTheme.colorScheme.onErrorContainer,
            )
        "paused" ->
            StatusVisual(
                "Paused",
                MaterialTheme.colorScheme.surfaceContainerHighest,
                MaterialTheme.colorScheme.onSurfaceVariant,
            )
        else ->
            StatusVisual(
                humanizeAccountName(status),
                MaterialTheme.colorScheme.surfaceContainerHighest,
                MaterialTheme.colorScheme.onSurfaceVariant,
            )
    }

@Composable
fun StatusChip(
    status: String,
    modifier: Modifier = Modifier,
) {
    val visual = statusVisual(status)
    Row(
        modifier =
            modifier
                .clip(RoundedCornerShape(50))
                .background(visual.container)
                .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier =
                Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(visual.content),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text = visual.label,
            style = MaterialTheme.typography.labelMedium,
            color = visual.content,
        )
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun HeroButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: String? = null,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = ButtonDefaults.MediumContainerHeight),
        shapes = ButtonDefaults.shapes(),
        contentPadding = ButtonDefaults.MediumContentPadding,
    ) {
        if (icon != null) {
            LucideIcon(
                name = icon,
                tint = LocalContentColor.current,
                modifier = Modifier.size(ButtonDefaults.MediumIconSize),
            )
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.titleMedium)
    }
}

fun humanizeAccountName(raw: String): String {
    val trimmed = raw.trim()
    if (trimmed.length > 20 && !trimmed.contains(' ')) {
        return "Account · " + trimmed.takeLast(4)
    }
    return trimmed
        .lowercase(Locale.getDefault())
        .split(' ')
        .joinToString(" ") { word ->
            word.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
        }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun EmptyState(
    icon: String,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier =
                Modifier
                    .size(72.dp)
                    .clip(MaterialShapes.Sunny.toShape())
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(
                name = icon,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(32.dp),
            )
        }
        Spacer(Modifier.size(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
        )
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
