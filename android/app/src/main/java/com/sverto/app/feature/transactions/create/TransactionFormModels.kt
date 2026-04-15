package com.sverto.app.feature.transactions.create

import uniffi.sverto_core.AssetItem

/** Display string derived from a UniFFI-provided asset. */
val AssetItem.display: String get() = "$ticker — $name"

data class EntryFormState(
    val entryId: Int? = null,
    val accountId: String? = null,
    val accountName: String = "",
    val assetId: Int? = null,
    val assetDisplay: String = "",
    val amount: String = "",
)

data class TransactionFormState(
    val date: Long? = null,
    val description: String = "",
    val categoryId: Int? = null,
    val categoryName: String = "",
    val originAssetId: Int? = null,
    val originAssetDisplay: String = "",
    val primaryEntry: EntryFormState = EntryFormState(),
    val secondaryEntry: EntryFormState = EntryFormState(),
)

enum class SubmitState {
    IDLE,
    SUBMITTING,
    SUCCESS,
}
