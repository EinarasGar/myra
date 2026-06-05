package com.sverto.app.feature.categories.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.sverto.app.core.icons.LucideIcon
import uniffi.sverto_core.ManagedCategory
import uniffi.sverto_core.ManagedCategoryType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryFormSheet(
    existing: ManagedCategory?,
    types: List<ManagedCategoryType>,
    onSubmit: (CategoryFormResult) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var name by remember(existing?.id) { mutableStateOf(existing?.name ?: "") }
    var icon by remember(existing?.id) { mutableStateOf(existing?.icon ?: "tag") }
    var typeId by
        remember(existing?.id) { mutableStateOf(existing?.categoryTypeId ?: types.firstOrNull()?.id) }
    var showIconPicker by remember { mutableStateOf(false) }
    var showTypePicker by remember { mutableStateOf(false) }

    val selectedTypeName = types.firstOrNull { it.id == typeId }?.name
    val canSave = name.isNotBlank() && typeId != null

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
        ) {
            Text(
                text = if (existing == null) "New category" else "Edit category",
                style = MaterialTheme.typography.headlineSmall,
            )
            Spacer(Modifier.height(16.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier =
                        Modifier
                            .size(56.dp)
                            .background(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.14f),
                                RoundedCornerShape(16.dp),
                            ).clickable { showIconPicker = true },
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(
                        name = icon,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(28.dp),
                    )
                }
                Spacer(Modifier.size(16.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = { if (it.length <= 100) name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(Modifier.height(16.dp))

            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clickable { showTypePicker = true }
                        .padding(vertical = 12.dp),
            ) {
                Column {
                    Text(
                        text = "Type",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = selectedTypeName ?: "Choose a type",
                        style = MaterialTheme.typography.titleMedium,
                        color =
                            if (selectedTypeName == null) {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            },
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onDismiss) { Text("Cancel") }
                Spacer(Modifier.size(8.dp))
                Button(
                    enabled = canSave,
                    onClick = {
                        val t = typeId ?: return@Button
                        onSubmit(
                            CategoryFormResult(
                                id = existing?.id,
                                name = name.trim(),
                                icon = icon,
                                typeId = t,
                            ),
                        )
                    },
                ) {
                    Text("Save")
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    if (showIconPicker) {
        LucideIconPickerSheet(
            onSelect = {
                icon = it
                showIconPicker = false
            },
            onDismiss = { showIconPicker = false },
        )
    }
    if (showTypePicker) {
        CategoryTypeSelectorSheet(
            types = types,
            selectedTypeId = typeId,
            onSelect = {
                typeId = it.id
                showTypePicker = false
            },
            onDismiss = { showTypePicker = false },
        )
    }
}
