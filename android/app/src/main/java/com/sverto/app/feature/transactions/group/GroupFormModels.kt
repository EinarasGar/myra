package com.sverto.app.feature.transactions.group

import uniffi.sverto_core.CreateTransactionInput

data class GroupFormState(
    val date: Long? = null,
    val description: String = "",
    val categoryId: Int? = null,
    val categoryName: String = "",
    val transactions: List<GroupTransactionItem> = emptyList(),
)

data class GroupTransactionItem(
    val input: CreateTransactionInput,
    val descriptionDisplay: String,
    val typeLabel: String,
    val amountDisplay: String,
    val accountName: String,
    val assetDisplay: String,
    val categoryName: String = "",
)

enum class GroupSubmitState {
    IDLE,
    SUBMITTING,
    SUCCESS,
}
