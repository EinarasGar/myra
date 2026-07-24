package com.sverto.app.feature.connectors

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uniffi.sverto_core.AccountListItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountPickerSheet(
    accounts: List<AccountListItem>,
    onSelect: (AccountListItem) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp),
        ) {
            Text(
                "Choose account",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 12.dp),
            )
            LazyColumn {
                items(accounts, key = { it.id }) { account ->
                    ListItem(
                        modifier = Modifier.clickable { onSelect(account) },
                        colors =
                            ListItemDefaults.colors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainer,
                            ),
                        headlineContent = { Text(account.name) },
                    )
                }
            }
        }
    }
}
