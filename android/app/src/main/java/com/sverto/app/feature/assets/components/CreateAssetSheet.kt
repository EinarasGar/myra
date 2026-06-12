package com.sverto.app.feature.assets.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uniffi.sverto_core.AssetTypeOption

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateAssetSheet(
    assetTypes: List<AssetTypeOption>,
    onSubmit: (name: String, ticker: String, assetType: Int, baseAssetId: Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var name by remember { mutableStateOf("") }
    var ticker by remember { mutableStateOf("") }
    var typeId by remember { mutableStateOf(assetTypes.firstOrNull()?.id) }
    var baseAssetId by remember { mutableStateOf<Int?>(null) }
    var baseAssetLabel by remember { mutableStateOf("") }
    var showBasePicker by remember { mutableStateOf(false) }

    val canSave = name.isNotBlank() && ticker.isNotBlank() && typeId != null && baseAssetId != null

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Column(Modifier.fillMaxWidth().padding(24.dp)) {
            Text("New asset", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { if (it.length <= 200) name = it },
                label = { Text("Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = ticker,
                onValueChange = { if (it.length <= 20) ticker = it },
                label = { Text("Ticker") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            AssetTypeDropdown(
                assetTypes = assetTypes,
                selectedId = typeId,
                onSelect = { typeId = it },
            )
            Spacer(Modifier.height(12.dp))
            LabeledPickerField(
                label = "Base pair asset",
                value = baseAssetLabel.ifBlank { "Select base asset" },
                onClick = { showBasePicker = true },
                valueColor =
                    if (baseAssetLabel.isBlank()) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    },
            )
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth()) {
                TextButton(onClick = onDismiss) { Text("Cancel") }
                Spacer(Modifier.weight(1f))
                Button(
                    enabled = canSave,
                    onClick = {
                        val t = typeId ?: return@Button
                        val b = baseAssetId ?: return@Button
                        onSubmit(name.trim(), ticker.trim(), t, b)
                    },
                ) { Text("Save") }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    if (showBasePicker) {
        AssetPickerSheet(
            title = "Select base asset",
            onSelect = { asset ->
                baseAssetId = asset.id
                baseAssetLabel = "${asset.ticker} — ${asset.name}"
                showBasePicker = false
            },
            onDismiss = { showBasePicker = false },
        )
    }
}
