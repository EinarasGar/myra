package com.sverto.app.feature.transactions

import androidx.compose.foundation.layout.Column
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.CallMade
import androidx.compose.material.icons.automirrored.outlined.CallReceived
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CurrencyExchange
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.sverto.app.core.icons.LucideIcon
import uniffi.sverto_core.TransactionListItem

/**
 * Fallback glyph for a transaction that carries no category (asset/cash
 * operations, groups). Categorised transactions use their own Lucide icon
 * instead — see [TransactionGlyph].
 */
fun transactionTypeIcon(type: String): ImageVector =
    when (type) {
        "asset_purchase" -> Icons.Outlined.ShoppingCart
        "asset_sale" -> Icons.Outlined.Payments
        "cash_transfer_in" -> Icons.AutoMirrored.Outlined.CallReceived
        "cash_transfer_out" -> Icons.AutoMirrored.Outlined.CallMade
        "cash_dividend", "asset_dividend" -> Icons.Outlined.Payments
        "asset_trade" -> Icons.Outlined.SwapHoriz
        "asset_transfer_in" -> Icons.AutoMirrored.Outlined.CallReceived
        "asset_transfer_out" -> Icons.AutoMirrored.Outlined.CallMade
        "asset_balance_transfer" -> Icons.Outlined.SwapHoriz
        "cash_balance_transfer" -> Icons.Outlined.CurrencyExchange
        "account_fees" -> Icons.Outlined.Receipt
        "group" -> Icons.Outlined.Layers
        else -> Icons.Outlined.AccountBalance
    }

/**
 * The leading glyph for a transaction row/hero. Renders the category's own
 * Lucide icon when the transaction is categorised, falling back to the
 * type-based Material glyph otherwise. This is the single source of truth so
 * the list, detail hero, group children and account screens all stay in sync.
 */
@Composable
fun TransactionGlyph(
    transaction: TransactionListItem,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.onSurfaceVariant,
) {
    if (transaction.categoryIcon.isNotEmpty()) {
        LucideIcon(
            name = transaction.categoryIcon,
            tint = tint,
            modifier = modifier,
        )
    } else {
        Icon(
            imageVector = transactionTypeIcon(transaction.transactionType),
            contentDescription = transaction.typeLabel,
            tint = tint,
            modifier = modifier,
        )
    }
}

/**
 * Trailing amount for a transaction row. Two-entry transactions (buy/sell/
 * trade) show the outgoing leg as the headline amount and the incoming leg as
 * a quieter second line, instead of cramming both into one long string.
 */
@Composable
fun TransactionAmount(
    transaction: TransactionListItem,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.End,
    ) {
        Text(
            text = transaction.amountDisplay,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
        )
        transaction.secondaryAmountDisplay?.let { secondary ->
            Text(
                text = signedSecondary(secondary),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

/**
 * The incoming leg of a two-entry transaction is positive, so present it as a
 * signed `+` value to read as a pair against the negative outgoing leg. Already
 * negative values (defensive) are left as-is.
 */
fun signedSecondary(secondary: String): String = if (secondary.startsWith("-")) secondary else "+$secondary"
