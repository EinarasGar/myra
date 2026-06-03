package com.sverto.app.feature.accounts.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ShowChart
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.BusinessCenter
import androidx.compose.material.icons.outlined.CreditCard
import androidx.compose.material.icons.outlined.CurrencyBitcoin
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Money
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Single source of truth for how an account type is rendered across the feature:
 * list cards, the grouped section headers, and the add-account type picker all read
 * from here so the visual language stays consistent.
 *
 * Type ids mirror the `account_types` reference table.
 */

private enum class AccountTone { Banking, Savings, Asset, Liability }

/**
 * Order account-type sections appear in the accounts list: assets first (banking, savings,
 * investments, pensions, property, crypto), liabilities last. Unknown ids fall to the end.
 */
val accountTypeDisplayOrder: List<Int> = listOf(1, 11, 2, 3, 5, 6, 9, 10, 4, 7, 8)

private fun accountTone(accountTypeId: Int): AccountTone =
    when (accountTypeId) {
        2 -> AccountTone.Savings
        3, 5, 6, 9, 10 -> AccountTone.Asset
        4, 7, 8 -> AccountTone.Liability
        else -> AccountTone.Banking
    }

fun accountTypeLabel(accountTypeId: Int): String =
    when (accountTypeId) {
        1 -> "Current"
        2 -> "Savings"
        3 -> "Investment"
        4 -> "Credit"
        5 -> "Personal Pension"
        6 -> "Workplace Pension"
        7 -> "Mortgage"
        8 -> "Loan"
        9 -> "Real Estate"
        10 -> "Crypto Wallet"
        11 -> "Cash"
        else -> "Account"
    }

fun accountTypeIcon(accountTypeId: Int): ImageVector =
    when (accountTypeId) {
        1 -> Icons.Outlined.AccountBalance
        2 -> Icons.Outlined.Savings
        3 -> Icons.AutoMirrored.Outlined.ShowChart
        4 -> Icons.Outlined.CreditCard
        5 -> Icons.Outlined.AccountBalanceWallet
        6 -> Icons.Outlined.BusinessCenter
        7 -> Icons.Outlined.Home
        8 -> Icons.Outlined.Payments
        9 -> Icons.Outlined.Apartment
        10 -> Icons.Outlined.CurrencyBitcoin
        11 -> Icons.Outlined.Money
        else -> Icons.Outlined.AccountBalance
    }

@Composable
fun accountTypeContainerColor(accountTypeId: Int): Color =
    when (accountTone(accountTypeId)) {
        AccountTone.Banking -> MaterialTheme.colorScheme.primaryContainer
        AccountTone.Savings -> MaterialTheme.colorScheme.secondaryContainer
        AccountTone.Asset -> MaterialTheme.colorScheme.tertiaryContainer
        AccountTone.Liability -> MaterialTheme.colorScheme.errorContainer
    }

@Composable
fun accountTypeOnContainerColor(accountTypeId: Int): Color =
    when (accountTone(accountTypeId)) {
        AccountTone.Banking -> MaterialTheme.colorScheme.onPrimaryContainer
        AccountTone.Savings -> MaterialTheme.colorScheme.onSecondaryContainer
        AccountTone.Asset -> MaterialTheme.colorScheme.onTertiaryContainer
        AccountTone.Liability -> MaterialTheme.colorScheme.onErrorContainer
    }
