package com.sverto.app.feature.assets.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/**
 * Shared asset list row: a tinted ticker monogram, semibold ticker headline,
 * and a supporting line. Used by the markets search results and asset pickers.
 * When [selected] is set, the row reads as the active single-select choice:
 * a secondaryContainer highlight and a trailing check.
 */
@Composable
fun AssetListRow(
    ticker: String,
    name: String,
    supportingText: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
) {
    val tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary
    ListItem(
        modifier =
            modifier
                .then(if (selected) Modifier.clip(MaterialTheme.shapes.large) else Modifier)
                .clickable(onClick = onClick),
        colors =
            ListItemDefaults.colors(
                containerColor =
                    if (selected) {
                        MaterialTheme.colorScheme.secondaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceContainer
                    },
            ),
        leadingContent = {
            Box(
                modifier =
                    Modifier.size(44.dp).background(tint.copy(alpha = 0.16f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = ticker.take(3).ifBlank { "—" },
                    style = MaterialTheme.typography.labelLarge,
                    color = tint,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        },
        headlineContent = {
            Text(
                text = ticker.ifBlank { name },
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent = {
            Text(
                text = supportingText,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        trailingContent =
            if (selected) {
                {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = "Selected",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            } else {
                null
            },
    )
}
