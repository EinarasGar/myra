package com.sverto.app.feature.transactions.create

enum class AmountSign { POSITIVE, NEGATIVE, ANY }

sealed interface EntryMode {
    data class Single(
        val jsonKey: String = "entry",
        val amountSign: AmountSign = AmountSign.ANY,
        val hasCategory: Boolean = false,
        val hasDescription: Boolean = false,
        val hasOriginAsset: Boolean = false,
    ) : EntryMode

    data class Dual(
        val primaryLabel: String,
        val primaryJsonKey: String,
        val primarySign: AmountSign,
        val primaryAmountLabel: String,
        val secondaryLabel: String,
        val secondaryJsonKey: String,
        val secondarySign: AmountSign,
        val secondaryAmountLabel: String,
        val sameAccount: Boolean = false,
    ) : EntryMode
}

data class TransactionTypeConfig(
    val apiType: String,
    val label: String,
    val entryMode: EntryMode,
)

@Suppress("LongMethod")
fun getTransactionTypeConfig(typeKey: String): TransactionTypeConfig =
    when (typeKey) {
        "regular_transaction" ->
            TransactionTypeConfig(
                apiType = "regular",
                label = "Purchase",
                entryMode =
                    EntryMode.Single(
                        amountSign = AmountSign.ANY,
                        hasCategory = true,
                        hasDescription = true,
                    ),
            )
        "account_fees" ->
            TransactionTypeConfig(
                apiType = "account_fees",
                label = "Account Fees",
                entryMode = EntryMode.Single(amountSign = AmountSign.NEGATIVE),
            )
        "cash_transfer_in" ->
            TransactionTypeConfig(
                apiType = "cash_transfer_in",
                label = "Cash In",
                entryMode = EntryMode.Single(amountSign = AmountSign.POSITIVE),
            )
        "cash_transfer_out" ->
            TransactionTypeConfig(
                apiType = "cash_transfer_out",
                label = "Cash Out",
                entryMode = EntryMode.Single(amountSign = AmountSign.NEGATIVE),
            )
        "asset_transfer_in" ->
            TransactionTypeConfig(
                apiType = "asset_transfer_in",
                label = "Asset Transfer In",
                entryMode = EntryMode.Single(amountSign = AmountSign.POSITIVE),
            )
        "asset_transfer_out" ->
            TransactionTypeConfig(
                apiType = "asset_transfer_out",
                label = "Asset Transfer Out",
                entryMode = EntryMode.Single(amountSign = AmountSign.NEGATIVE),
            )
        "cash_dividend" ->
            TransactionTypeConfig(
                apiType = "cash_dividend",
                label = "Cash Dividend",
                entryMode =
                    EntryMode.Single(
                        amountSign = AmountSign.POSITIVE,
                        hasOriginAsset = true,
                    ),
            )
        "asset_dividend" ->
            TransactionTypeConfig(
                apiType = "asset_dividend",
                label = "Asset Dividend",
                entryMode = EntryMode.Single(amountSign = AmountSign.POSITIVE),
            )
        "asset_purchase" ->
            TransactionTypeConfig(
                apiType = "asset_purchase",
                label = "Buy Asset",
                entryMode =
                    EntryMode.Dual(
                        primaryLabel = "Receiving",
                        primaryJsonKey = "purchase_change",
                        primarySign = AmountSign.POSITIVE,
                        primaryAmountLabel = "Number of units",
                        secondaryLabel = "Paying",
                        secondaryJsonKey = "cash_outgoings_change",
                        secondarySign = AmountSign.NEGATIVE,
                        secondaryAmountLabel = "Amount paid",
                        sameAccount = true,
                    ),
            )
        "asset_sale" ->
            TransactionTypeConfig(
                apiType = "asset_sale",
                label = "Sell Asset",
                entryMode =
                    EntryMode.Dual(
                        primaryLabel = "Selling",
                        primaryJsonKey = "sale_entry",
                        primarySign = AmountSign.NEGATIVE,
                        primaryAmountLabel = "Units sold",
                        secondaryLabel = "Receiving",
                        secondaryJsonKey = "proceeds_entry",
                        secondarySign = AmountSign.POSITIVE,
                        secondaryAmountLabel = "Proceeds",
                        sameAccount = true,
                    ),
            )
        "asset_trade" ->
            TransactionTypeConfig(
                apiType = "asset_trade",
                label = "Trade Assets",
                entryMode =
                    EntryMode.Dual(
                        primaryLabel = "Paying",
                        primaryJsonKey = "outgoing_entry",
                        primarySign = AmountSign.NEGATIVE,
                        primaryAmountLabel = "Units out",
                        secondaryLabel = "Receiving",
                        secondaryJsonKey = "incoming_entry",
                        secondarySign = AmountSign.POSITIVE,
                        secondaryAmountLabel = "Units in",
                    ),
            )
        "asset_balance_transfer" ->
            TransactionTypeConfig(
                apiType = "asset_balance_transfer",
                label = "Balance Transfer",
                entryMode =
                    EntryMode.Dual(
                        primaryLabel = "From",
                        primaryJsonKey = "outgoing_change",
                        primarySign = AmountSign.NEGATIVE,
                        primaryAmountLabel = "Units leaving",
                        secondaryLabel = "To",
                        secondaryJsonKey = "incoming_change",
                        secondarySign = AmountSign.POSITIVE,
                        secondaryAmountLabel = "Units arriving",
                    ),
            )
        else -> error("Unknown transaction type: $typeKey")
    }

fun apiTypeToConfigKey(apiType: String): String =
    when (apiType) {
        "regular" -> "regular_transaction"
        else -> apiType
    }
