package com.sverto.app.feature.transactions

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FloatingActionButtonMenu
import androidx.compose.material3.FloatingActionButtonMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ToggleFloatingActionButton
import androidx.compose.material3.animateFloatingActionButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.rememberVectorPainter

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun FabMenu(
    expanded: Boolean,
    onToggle: () -> Unit,
    onQuickUpload: () -> Unit,
    onManualEntry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    FloatingActionButtonMenu(
        modifier = modifier,
        expanded = expanded,
        button = {
            ToggleFloatingActionButton(
                modifier = Modifier.animateFloatingActionButton(
                    visible = true,
                    alignment = Alignment.BottomEnd,
                ),
                checked = expanded,
                onCheckedChange = { onToggle() },
            ) {
                val imageVector by remember {
                    derivedStateOf {
                        if (checkedProgress > 0.5f) Icons.Filled.Close
                        else Icons.Filled.Add
                    }
                }
                Icon(
                    painter = rememberVectorPainter(imageVector),
                    contentDescription = if (expanded) "Close menu" else "Add transaction",
                )
            }
        },
    ) {
        FloatingActionButtonMenuItem(
            onClick = {
                onToggle()
                onQuickUpload()
            },
            icon = { Icon(Icons.Outlined.CameraAlt, contentDescription = null) },
            text = { Text("Quick Upload") },
        )
        FloatingActionButtonMenuItem(
            onClick = {
                onToggle()
                onManualEntry()
            },
            icon = { Icon(Icons.Outlined.Edit, contentDescription = null) },
            text = { Text("Manual Entry") },
        )
    }
}
