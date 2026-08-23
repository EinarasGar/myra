package com.sverto.app.feature.server

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServerSettingsSheet(
    serverUrl: String,
    serverVersion: String,
    authModeLabel: String,
    onSwitchServer: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier.padding(24.dp).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = ServerCopy.SERVER_SETTINGS_TITLE,
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(8.dp))
            ServerSettingsRow(label = ServerCopy.SERVER_URL, value = serverUrl)
            ServerSettingsRow(label = ServerCopy.SERVER_VERSION, value = serverVersion)
            ServerSettingsRow(label = ServerCopy.AUTH_MODE, value = authModeLabel)
            Spacer(Modifier.height(16.dp))
            OutlinedButton(onClick = onSwitchServer, modifier = Modifier.fillMaxWidth()) {
                Text(ServerCopy.SWITCH_SERVER)
            }
        }
    }
}

@Composable
private fun ServerSettingsRow(
    label: String,
    value: String,
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
