package com.sverto.app.feature.portfolio

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ShowChart
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CurrencyBitcoin
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.PieChart
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sverto.app.core.Money
import com.sverto.app.core.ui.RowDivider
import uniffi.sverto_core.HoldingItem
import java.text.NumberFormat
import java.util.Locale

@Composable
fun HoldingsList(
    holdings: List<HoldingItem>,
    baseTicker: String,
    onAssetClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (holdings.isEmpty()) return

    Column(modifier) {
        Text(
            text = "Holdings",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(bottom = 8.dp),
        )

        Surface(
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surfaceBright,
        ) {
            Column {
                holdings.forEachIndexed { index, holding ->
                    HoldingRow(holding, baseTicker, onClick = { onAssetClick(holding.assetId) })
                    if (index < holdings.lastIndex) {
                        RowDivider()
                    }
                }
            }
        }
    }
}

@Composable
private fun HoldingRow(
    holding: HoldingItem,
    baseTicker: String,
    onClick: () -> Unit,
) {
    val icon = holdingIcon(holding.assetTypeId)
    val iconTint = holdingIconTint(holding.assetTypeId)

    ListItem(
        modifier = Modifier.clickable(onClick = onClick),
        colors =
            ListItemDefaults.colors(
                containerColor = MaterialTheme.colorScheme.surfaceBright,
            ),
        leadingContent = {
            Box(
                modifier =
                    Modifier
                        .size(40.dp)
                        .background(
                            color = iconTint.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(12.dp),
                        ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = holding.assetName,
                    tint = iconTint,
                    modifier = Modifier.size(20.dp),
                )
            }
        },
        headlineContent = {
            Text(
                text = holding.assetName,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent = {
            Text(
                text = holding.ticker,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        },
        trailingContent = {
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = Money.format(holding.value, baseTicker),
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                )
                Text(
                    text = formatUnits(holding.units) + " units",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        },
    )
}

private const val ASSET_TYPE_CURRENCIES = 1
private const val ASSET_TYPE_STOCKS = 2
private const val ASSET_TYPE_BONDS = 3
private const val ASSET_TYPE_MUTUAL_FUNDS = 4
private const val ASSET_TYPE_ETFS = 5
private const val ASSET_TYPE_ETCS = 6
private const val ASSET_TYPE_CRYPTO = 7
private const val ASSET_TYPE_REAL_ESTATE = 8

private fun holdingIcon(assetTypeId: Int): ImageVector =
    when (assetTypeId) {
        ASSET_TYPE_CURRENCIES -> Icons.Outlined.Payments
        ASSET_TYPE_STOCKS -> Icons.AutoMirrored.Outlined.ShowChart
        ASSET_TYPE_BONDS -> Icons.Outlined.AccountBalance
        ASSET_TYPE_MUTUAL_FUNDS, ASSET_TYPE_ETFS, ASSET_TYPE_ETCS -> Icons.Outlined.PieChart
        ASSET_TYPE_CRYPTO -> Icons.Outlined.CurrencyBitcoin
        ASSET_TYPE_REAL_ESTATE -> Icons.Outlined.Home
        else -> Icons.Outlined.Layers
    }

@Composable
private fun holdingIconTint(assetTypeId: Int) =
    when (assetTypeId) {
        ASSET_TYPE_CURRENCIES -> MaterialTheme.colorScheme.primary
        ASSET_TYPE_CRYPTO -> MaterialTheme.colorScheme.secondary
        ASSET_TYPE_REAL_ESTATE -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.tertiary
    }

private fun formatUnits(units: Double): String {
    val fmt = NumberFormat.getNumberInstance(Locale.getDefault())
    fmt.maximumFractionDigits = 4
    return fmt.format(units)
}
