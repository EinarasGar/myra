package com.sverto.app.feature.transactions.quickupload

import com.sverto.app.feature.transactions.create.EntryFormState
import com.sverto.app.feature.transactions.create.TransactionFormState
import com.sverto.app.feature.transactions.group.GroupFormState
import com.sverto.app.feature.transactions.group.GroupTransactionItem
import org.json.JSONObject
import uniffi.sverto_core.CreateTransactionInput
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneOffset

fun parseProposalSummary(proposalData: String?): ProposalSummary? {
    if (proposalData == null) return null
    return try {
        val json = JSONObject(proposalData)
        ProposalSummary(
            description = json.optString("description", "Receipt"),
            date = json.optString("date", ""),
            amount = if (json.has("amount")) json.optString("amount") else null,
        )
    } catch (_: Exception) {
        null
    }
}

fun proposalToFormState(proposalData: String, lookupTables: String): TransactionFormState {
    val data = JSONObject(proposalData)
    val lookups = JSONObject(lookupTables)

    val date = data.optString("date", "").let { dateStr ->
        if (dateStr.isNotEmpty()) {
            try {
                LocalDate.parse(dateStr).atStartOfDay().toEpochSecond(ZoneOffset.UTC)
            } catch (_: Exception) {
                System.currentTimeMillis() / 1000
            }
        } else {
            System.currentTimeMillis() / 1000
        }
    }

    val accountId = data.optString("account_id", "")
    val accountName = findAccountName(accountId, lookups)
    val assetId = if (data.has("asset_id")) data.optInt("asset_id", 0) else 0
    val assetDisplay = findAssetDisplay(assetId, lookups)
    val categoryId = if (data.has("category_id")) data.optInt("category_id") else null
    val categoryName = findCategoryName(categoryId, lookups)
    val amount = data.optString("amount", "")

    return TransactionFormState(
        date = date,
        description = data.optString("description", ""),
        categoryId = categoryId,
        categoryName = categoryName,
        primaryEntry = EntryFormState(
            accountId = accountId,
            accountName = accountName,
            assetId = assetId,
            assetDisplay = assetDisplay,
            amount = amount,
        ),
    )
}

private fun findAccountName(id: String, lookups: JSONObject): String {
    val accounts = lookups.optJSONArray("accounts") ?: return ""
    for (i in 0 until accounts.length()) {
        val acc = accounts.getJSONObject(i)
        if (acc.optString("account_id") == id) return acc.optString("name", "")
    }
    return ""
}

private fun findAssetDisplay(id: Int, lookups: JSONObject): String {
    if (id == 0) return ""
    val assets = lookups.optJSONArray("assets") ?: return ""
    for (i in 0 until assets.length()) {
        val asset = assets.getJSONObject(i)
        if (asset.optInt("asset_id") == id) {
            val ticker = asset.optString("ticker", "")
            val name = asset.optString("name", "")
            return if (ticker.isNotEmpty()) "$ticker — $name" else name
        }
    }
    return ""
}

private fun findCategoryName(id: Int?, lookups: JSONObject): String {
    if (id == null) return ""
    val categories = lookups.optJSONArray("categories") ?: return ""
    for (i in 0 until categories.length()) {
        val cat = categories.getJSONObject(i)
        if (cat.optInt("id") == id) return cat.optString("category", "")
    }
    return ""
}

fun proposalToGroupFormState(proposalData: String, lookupTables: String): GroupFormState {
    val data = JSONObject(proposalData)
    val lookups = JSONObject(lookupTables)

    val date = data.optString("date", "").let { dateStr ->
        if (dateStr.isNotEmpty()) {
            try {
                LocalDate.parse(dateStr).atStartOfDay().toEpochSecond(ZoneOffset.UTC)
            } catch (_: Exception) {
                System.currentTimeMillis() / 1000
            }
        } else {
            System.currentTimeMillis() / 1000
        }
    }

    val categoryId = if (data.has("category_id")) data.optInt("category_id") else null
    val categoryName = findCategoryName(categoryId, lookups)

    val txArray = data.optJSONArray("transactions")
    val transactions = mutableListOf<GroupTransactionItem>()
    if (txArray != null) {
        for (i in 0 until txArray.length()) {
            val tx = txArray.getJSONObject(i)
            val accountId = tx.optString("account_id", "")
            val assetId = if (tx.has("asset_id")) tx.optInt("asset_id", 0) else 0
            val txCategoryId = if (tx.has("category_id")) tx.optInt("category_id") else null
            val amount = tx.optString("amount", "0")
            val description = tx.optString("description", "")

            transactions.add(
                GroupTransactionItem(
                    input = CreateTransactionInput(
                        transactionId = null,
                        typeKey = "regular",
                        date = date,
                        primaryEntryId = null,
                        primaryAccountId = accountId,
                        primaryAssetId = assetId,
                        primaryAmount = amount.toDoubleOrNull() ?: 0.0,
                        secondaryEntryId = null,
                        secondaryAccountId = null,
                        secondaryAssetId = null,
                        secondaryAmount = null,
                        originAssetId = null,
                        categoryId = txCategoryId,
                        description = description.ifBlank { null },
                    ),
                    descriptionDisplay = description.ifBlank { "Transaction ${i + 1}" },
                    typeLabel = "Regular Transaction",
                    amountDisplay = BigDecimal(amount).stripTrailingZeros().toPlainString(),
                    accountName = findAccountName(accountId, lookups),
                    assetDisplay = findAssetDisplay(assetId, lookups),
                    categoryName = findCategoryName(txCategoryId, lookups),
                ),
            )
        }
    }

    return GroupFormState(
        date = date,
        description = data.optString("description", ""),
        categoryId = categoryId,
        categoryName = categoryName,
        transactions = transactions,
    )
}
