package com.sverto.app.feature.categories.components

import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import uniffi.sverto_core.ManagedCategoryType

@Composable
fun CategoryTypeRow(
    type: ManagedCategoryType,
    onEdit: (ManagedCategoryType) -> Unit,
    onDelete: (ManagedCategoryType) -> Unit,
    modifier: Modifier = Modifier,
) {
    ListItem(
        modifier = modifier,
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
        headlineContent = {
            Text(
                text = type.name,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        trailingContent = {
            if (type.isGlobal) {
                Text(
                    text = "Global",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Row {
                    IconButton(onClick = { onEdit(type) }) {
                        Icon(
                            Icons.Outlined.Edit,
                            contentDescription = "Edit ${type.name}",
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                    IconButton(onClick = { onDelete(type) }) {
                        Icon(
                            Icons.Outlined.Delete,
                            contentDescription = "Delete ${type.name}",
                            tint = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        },
    )
}
