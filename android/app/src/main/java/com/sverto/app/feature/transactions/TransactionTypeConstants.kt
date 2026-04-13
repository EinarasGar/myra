package com.sverto.app.feature.transactions

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.CallMade
import androidx.compose.material.icons.automirrored.outlined.CallReceived
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.ui.graphics.vector.ImageVector

data class TransactionTypeDefinition(
    val key: String,
    val label: String,
    val description: String,
    val icon: ImageVector,
)

data class TransactionTypeGroup(
    val label: String,
    val types: List<TransactionTypeDefinition>,
)

val TransactionTypeGroups =
    listOf(
        TransactionTypeGroup(
            label = "Everyday",
            types =
                listOf(
                    TransactionTypeDefinition(
                        key = "regular_transaction",
                        label = "Purchase",
                        description = "Buy goods or services",
                        icon = Icons.Outlined.ShoppingCart,
                    ),
                    TransactionTypeDefinition(
                        key = "account_fees",
                        label = "Account Fees",
                        description = "Service or maintenance fees",
                        icon = Icons.Outlined.Receipt,
                    ),
                ),
        ),
        TransactionTypeGroup(
            label = "Investments",
            types =
                listOf(
                    TransactionTypeDefinition(
                        key = "asset_purchase",
                        label = "Buy Asset",
                        description = "Purchase stocks, ETFs, crypto",
                        icon = Icons.Outlined.ShoppingCart,
                    ),
                    TransactionTypeDefinition(
                        key = "asset_sale",
                        label = "Sell Asset",
                        description = "Sell holdings for cash",
                        icon = Icons.Outlined.Payments,
                    ),
                    TransactionTypeDefinition(
                        key = "asset_trade",
                        label = "Trade Assets",
                        description = "Swap one asset for another",
                        icon = Icons.Outlined.SwapHoriz,
                    ),
                    TransactionTypeDefinition(
                        key = "cash_dividend",
                        label = "Cash Dividend",
                        description = "Receive dividend in cash",
                        icon = Icons.Outlined.Payments,
                    ),
                    TransactionTypeDefinition(
                        key = "asset_dividend",
                        label = "Asset Dividend",
                        description = "Receive dividend in shares",
                        icon = Icons.Outlined.Payments,
                    ),
                    TransactionTypeDefinition(
                        key = "asset_balance_transfer",
                        label = "Balance Transfer",
                        description = "Move asset balance between accounts",
                        icon = Icons.Outlined.SwapHoriz,
                    ),
                ),
        ),
        TransactionTypeGroup(
            label = "Transfers",
            types =
                listOf(
                    TransactionTypeDefinition(
                        key = "cash_transfer_in",
                        label = "Cash In",
                        description = "Deposit cash into account",
                        icon = Icons.AutoMirrored.Outlined.CallReceived,
                    ),
                    TransactionTypeDefinition(
                        key = "cash_transfer_out",
                        label = "Cash Out",
                        description = "Withdraw cash from account",
                        icon = Icons.AutoMirrored.Outlined.CallMade,
                    ),
                    TransactionTypeDefinition(
                        key = "asset_transfer_in",
                        label = "Asset Transfer In",
                        description = "Receive assets into account",
                        icon = Icons.AutoMirrored.Outlined.CallReceived,
                    ),
                    TransactionTypeDefinition(
                        key = "asset_transfer_out",
                        label = "Asset Transfer Out",
                        description = "Send assets from account",
                        icon = Icons.AutoMirrored.Outlined.CallMade,
                    ),
                ),
        ),
    )
