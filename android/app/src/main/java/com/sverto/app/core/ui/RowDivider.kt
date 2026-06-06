package com.sverto.app.core.ui

import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Divider between rows inside a grouped list card (surfaceBright surfaces). Uses surfaceContainer so
 * it reads as a hairline gap against the brighter card, matching the app's M3 Expressive surfaces.
 */
@Composable
fun RowDivider(modifier: Modifier = Modifier) {
    HorizontalDivider(
        modifier = modifier,
        color = MaterialTheme.colorScheme.surfaceContainer,
    )
}
