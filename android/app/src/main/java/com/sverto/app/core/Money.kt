package com.sverto.app.core

import uniffi.sverto_core.formatMoney

object Money {
    fun format(
        amount: Double,
        ticker: String,
        signed: Boolean = false,
    ): String = formatMoney(amount, ticker, signed)
}
