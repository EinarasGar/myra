package com.sverto.app.feature.transactions.create

import java.math.BigDecimal
import kotlin.math.abs

fun convertFormState(
    state: TransactionFormState,
    from: TransactionTypeConfig,
    to: TransactionTypeConfig,
): TransactionFormState {
    if (from.apiType == to.apiType) return state

    val sources = materialize(state, from.entryMode)
    val (primarySource, secondarySource) = assignSlots(sources, from.entryMode, to.entryMode)

    val targetPrimarySign = primarySignOf(to.entryMode)
    val targetSecondarySign = (to.entryMode as? EntryMode.Dual)?.secondarySign ?: AmountSign.ANY

    var primaryEntry = primarySource?.toEntryFormState(targetPrimarySign) ?: EntryFormState()
    val secondaryEntry = secondarySource?.toEntryFormState(targetSecondarySign) ?: EntryFormState()

    val mode = to.entryMode
    if (mode is EntryMode.Dual) {
        val filled = primarySource ?: secondarySource
        if (filled != null) {
            if (mode.sameAccount && primaryEntry.accountId == null) {
                primaryEntry =
                    primaryEntry.copy(accountId = filled.accountId, accountName = filled.accountName)
            }
            if (mode.sameAsset && primaryEntry.assetId == null) {
                primaryEntry =
                    primaryEntry.copy(assetId = filled.assetId, assetDisplay = filled.assetDisplay)
            }
            if (mode.sharedAmount && primaryEntry.amount.isBlank() && filled.signedAmount != null) {
                primaryEntry =
                    primaryEntry.copy(amount = amountText(filled.signedAmount, targetPrimarySign))
            }
        }
    }

    return state.copy(primaryEntry = primaryEntry, secondaryEntry = secondaryEntry)
}

private data class SourceEntry(
    val entryId: Int?,
    val accountId: String?,
    val accountName: String,
    val assetId: Int?,
    val assetDisplay: String,
    val signedAmount: Double?,
)

private fun materialize(
    state: TransactionFormState,
    mode: EntryMode,
): List<SourceEntry> =
    when (mode) {
        is EntryMode.Single -> listOf(state.primaryEntry.toSource(mode.amountSign))
        is EntryMode.Dual -> {
            val primary = state.primaryEntry.toSource(mode.primarySign)
            val secondary = state.secondaryEntry
            listOf(
                primary,
                SourceEntry(
                    entryId = secondary.entryId,
                    accountId = if (mode.sameAccount) primary.accountId else secondary.accountId,
                    accountName = if (mode.sameAccount) primary.accountName else secondary.accountName,
                    assetId = if (mode.sameAsset) primary.assetId else secondary.assetId,
                    assetDisplay = if (mode.sameAsset) primary.assetDisplay else secondary.assetDisplay,
                    signedAmount =
                        if (mode.sharedAmount) {
                            signedOrNull(state.primaryEntry.amount, mode.secondarySign)
                        } else {
                            signedOrNull(secondary.amount, mode.secondarySign)
                        },
                ),
            )
        }
    }

private fun assignSlots(
    sources: List<SourceEntry>,
    from: EntryMode,
    to: EntryMode,
): Pair<SourceEntry?, SourceEntry?> =
    when {
        to is EntryMode.Single && from is EntryMode.Single -> sources[0] to null
        to is EntryMode.Single -> matchSingleTarget(sources, to.amountSign) to null
        from is EntryMode.Single -> matchDualTarget(sources[0], to as EntryMode.Dual)
        else -> sources[0] to sources[1]
    }

private fun matchSingleTarget(
    sources: List<SourceEntry>,
    target: AmountSign,
): SourceEntry =
    sources.firstOrNull { it.matches(target) }
        ?: sources.firstOrNull { it.accountId != null }
        ?: sources[0]

private fun matchDualTarget(
    source: SourceEntry,
    to: EntryMode.Dual,
): Pair<SourceEntry?, SourceEntry?> =
    when {
        source.matches(to.primarySign) -> source to null
        source.matches(to.secondarySign) -> null to source
        else -> source to null
    }

private fun SourceEntry.matches(sign: AmountSign): Boolean {
    val amount = signedAmount ?: return false
    if (amount == 0.0) return false
    return when (sign) {
        AmountSign.POSITIVE -> amount > 0
        AmountSign.NEGATIVE -> amount < 0
        AmountSign.ANY -> false
    }
}

private fun SourceEntry.toEntryFormState(sign: AmountSign): EntryFormState =
    EntryFormState(
        entryId = entryId,
        accountId = accountId,
        accountName = accountName,
        assetId = assetId,
        assetDisplay = assetDisplay,
        amount = signedAmount?.let { amountText(it, sign) }.orEmpty(),
    )

private fun EntryFormState.toSource(sign: AmountSign): SourceEntry =
    SourceEntry(
        entryId = entryId,
        accountId = accountId,
        accountName = accountName,
        assetId = assetId,
        assetDisplay = assetDisplay,
        signedAmount = signedOrNull(amount, sign),
    )

private fun primarySignOf(mode: EntryMode): AmountSign =
    when (mode) {
        is EntryMode.Single -> mode.amountSign
        is EntryMode.Dual -> mode.primarySign
    }

private fun signedOrNull(
    raw: String,
    sign: AmountSign,
): Double? {
    val parsed = raw.toDoubleOrNull() ?: return null
    return when (sign) {
        AmountSign.POSITIVE -> abs(parsed)
        AmountSign.NEGATIVE -> -abs(parsed)
        AmountSign.ANY -> parsed
    }
}

private fun amountText(
    value: Double,
    sign: AmountSign,
): String {
    val applied = if (sign == AmountSign.ANY) value else abs(value)
    return BigDecimal.valueOf(applied).stripTrailingZeros().toPlainString()
}
