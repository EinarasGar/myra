package com.sverto.app.feature.assets.components

import uniffi.sverto_core.AssetItem
import java.util.Currency
import java.util.Locale

private val PINNED_CURRENCY_CODES =
    listOf("USD", "EUR", "GBP", "JPY", "CNY", "INR", "CAD", "AUD", "CHF")

private fun deviceCurrencyCode(): String? = runCatching { Currency.getInstance(Locale.getDefault()).currencyCode }.getOrNull()

/**
 * Orders currencies for pickers: the device-locale currency first, then a fixed set of the
 * world's most-used currencies, then everything else alphabetically by ticker.
 */
fun orderCurrencies(currencies: List<AssetItem>): List<AssetItem> {
    val priority =
        buildList {
            deviceCurrencyCode()?.let { add(it.uppercase()) }
            addAll(PINNED_CURRENCY_CODES)
        }.distinct()

    val byTicker = currencies.associateBy { it.ticker.uppercase() }
    val pinned = priority.mapNotNull { byTicker[it] }
    val pinnedIds = pinned.mapTo(mutableSetOf()) { it.id }
    val rest = currencies.filterNot { it.id in pinnedIds }.sortedBy { it.ticker.uppercase() }
    return pinned + rest
}
