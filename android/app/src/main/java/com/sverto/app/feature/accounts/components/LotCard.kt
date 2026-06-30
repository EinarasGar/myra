package com.sverto.app.feature.accounts.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sverto.app.core.Money
import uniffi.sverto_core.LotItem
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Suppress("NewApi")
private fun formatLotDate(epochSeconds: Long): String =
    Instant
        .ofEpochSecond(epochSeconds)
        .atZone(ZoneId.systemDefault())
        .toLocalDate()
        .format(DateTimeFormatter.ofPattern("MMM d, yyyy"))

private fun formatUnits(value: Double): String =
    if (value == value.toLong().toDouble()) {
        value.toLong().toString()
    } else {
        "%.4f".format(value)
    }

private fun formatLotPercent(value: Double): String = "%.1f".format(value)

@Composable
fun LotCard(
    lot: LotItem,
    baseTicker: String,
    showAccount: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val isClosed = lot.unitsRemaining <= 0.0
    val buyDateStr = formatLotDate(lot.buyDate)
    val gainColor =
        if (lot.gainPercent >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
    val realizedColor =
        if (lot.realizedGains >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color =
            if (isClosed) {
                MaterialTheme.colorScheme.surfaceContainerHigh
            } else {
                MaterialTheme.colorScheme.surfaceBright
            },
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (showAccount) {
                Text(
                    text = lot.accountName,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Units held (remaining of bought) + unrealized % badge (open lots only)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "${formatUnits(lot.unitsRemaining)} of ${formatUnits(lot.unitsBought)} units held",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color =
                        if (isClosed) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        },
                )
                if (!isClosed) {
                    val gainSign = if (lot.gainPercent >= 0) "+" else "-"
                    Box(
                        modifier =
                            Modifier
                                .background(
                                    color = gainColor.copy(alpha = 0.12f),
                                    shape = RoundedCornerShape(6.dp),
                                ).padding(horizontal = 8.dp, vertical = 2.dp),
                    ) {
                        Text(
                            text = "$gainSign${formatLotPercent(lot.gainPercent)}%",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = gainColor,
                        )
                    }
                }
            }

            // Acquisition date + buy price (CLOSED marker on fully-sold lots)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = if (isClosed) "$buyDateStr · CLOSED" else "Bought $buyDateStr",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "@ ${Money.format(lot.buyPricePerUnit, baseTicker)}/unit",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Unrealized P&L + current value (only while units remain)
            if (!isClosed) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Unrealized: ${Money.format(lot.unrealizedGains, baseTicker, signed = true)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = gainColor,
                    )
                    Text(
                        text = "Value: ${Money.format(lot.currentValue, baseTicker)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // Realized P&L from the sold portion (only when something was sold)
            if (lot.unitsSold > 0.0) {
                Text(
                    text =
                        "Realized: ${Money.format(lot.realizedGains, baseTicker, signed = true)} · " +
                            "${formatUnits(lot.unitsSold)} sold",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = realizedColor,
                )
            }
        }
    }
}
