package com.sverto.app.feature.transactions.create

private val SIGNED_NUMERIC_PREFIX = Regex("""^-?\d*\.?\d*""")
private val UNSIGNED_NUMERIC_PREFIX = Regex("""^\d*\.?\d*""")

internal fun filterAmountInput(
    input: String,
    allowNegative: Boolean,
): String {
    val regex = if (allowNegative) SIGNED_NUMERIC_PREFIX else UNSIGNED_NUMERIC_PREFIX
    return regex.find(input)?.value.orEmpty()
}
