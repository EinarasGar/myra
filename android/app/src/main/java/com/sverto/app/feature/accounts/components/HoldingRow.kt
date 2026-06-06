package com.sverto.app.feature.accounts.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uniffi.sverto_core.AccountHoldingItem

@Composable
fun HoldingRow(
    holding: AccountHoldingItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val gainPercent = if (holding.costBasis != 0.0) holding.unrealizedGains / holding.costBasis * 100 else 0.0
    val gainColor = if (gainPercent >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
    val gainSign = if (gainPercent >= 0) "+" else "-"

    ListItem(
        modifier = modifier.clickable(onClick = onClick),
        colors =
            ListItemDefaults.colors(
                containerColor = MaterialTheme.colorScheme.surfaceBright,
            ),
        leadingContent = {
            Box(
                modifier =
                    Modifier
                        .size(36.dp)
                        .background(
                            color = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f),
                            shape = CircleShape,
                        ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = holding.ticker.firstOrNull()?.toString() ?: "?",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }
        },
        headlineContent = {
            Text(
                text = holding.ticker,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
            )
        },
        supportingContent = {
            Text(
                text = "%.4f units".format(holding.units),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingContent = {
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = formatCurrency(holding.value),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "$gainSign${formatPercent(gainPercent)}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = gainColor,
                )
            }
        },
    )
}
