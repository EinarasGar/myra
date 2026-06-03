package com.sverto.app.feature.aichat

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import uniffi.sverto_core.ConversationItem

@Composable
fun ConversationDrawer(
    conversations: List<ConversationItem>,
    activeConversationId: String?,
    onSelect: (String) -> Unit,
    onCreate: () -> Unit,
    onDelete: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    ModalDrawerSheet(
        modifier = modifier.width(304.dp),
    ) {
        Spacer(Modifier.height(16.dp))

        // New chat action (Gemini-style compose button).
        NavigationDrawerItem(
            label = { Text("New chat", style = MaterialTheme.typography.labelLarge) },
            selected = false,
            onClick = onCreate,
            icon = {
                Icon(
                    imageVector = Icons.Outlined.Edit,
                    contentDescription = null,
                )
            },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
        )

        if (conversations.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Text(
                text = "Recent",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 28.dp, end = 16.dp, bottom = 4.dp),
            )
        }

        LazyColumn {
            items(
                items = conversations,
                key = { it.id },
            ) { conversation ->
                NavigationDrawerItem(
                    label = {
                        Text(
                            text = conversation.title,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    selected = conversation.id == activeConversationId,
                    onClick = { onSelect(conversation.id) },
                    badge = {
                        IconButton(onClick = { onDelete(conversation.id) }) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete conversation",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    },
                    colors =
                        NavigationDrawerItemDefaults.colors(
                            selectedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                        ),
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
            }
        }
    }
}
