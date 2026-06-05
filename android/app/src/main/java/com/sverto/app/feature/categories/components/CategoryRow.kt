package com.sverto.app.feature.categories.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sverto.app.core.icons.LucideIcon
import uniffi.sverto_core.ManagedCategory

@Composable
fun CategoryRow(
    category: ManagedCategory,
    onEdit: (ManagedCategory) -> Unit,
    onDelete: (ManagedCategory) -> Unit,
    modifier: Modifier = Modifier,
) {
    val readOnly = category.isGlobal || category.isSystem
    val tint = MaterialTheme.colorScheme.primary
    ListItem(
        modifier = modifier,
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
        leadingContent = {
            Box(
                modifier =
                    Modifier
                        .size(40.dp)
                        .background(tint.copy(alpha = 0.14f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center,
            ) {
                LucideIcon(name = category.icon, tint = tint, modifier = Modifier.size(20.dp))
            }
        },
        headlineContent = {
            Text(
                text = category.name,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent = {
            Text(
                text = category.typeName,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingContent = {
            if (readOnly) {
                Text(
                    text = if (category.isSystem) "System" else "Global",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Row {
                    IconButton(onClick = { onEdit(category) }) {
                        Icon(
                            Icons.Outlined.Edit,
                            contentDescription = "Edit ${category.name}",
                            tint = tint,
                        )
                    }
                    IconButton(onClick = { onDelete(category) }) {
                        Icon(
                            Icons.Outlined.Delete,
                            contentDescription = "Delete ${category.name}",
                            tint = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        },
    )
}
