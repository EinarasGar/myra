package com.sverto.app.feature.transactions.create

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

private const val ACCOUNT_A = "11111111-1111-1111-1111-111111111111"

private fun purchaseState(amount: String) =
    TransactionFormState(
        transactionId = "tx-1",
        date = 1_753_000_000L,
        description = "CASHBACK",
        categoryId = 7,
        categoryName = "Miscellaneous",
        primaryEntry =
            EntryFormState(
                entryId = 42,
                accountId = ACCOUNT_A,
                accountName = "Main",
                assetId = 1,
                assetDisplay = "GBP — Pound Sterling",
                amount = amount,
            ),
    )

private fun buyAssetState() =
    TransactionFormState(
        transactionId = "tx-2",
        date = 1_753_000_000L,
        primaryEntry =
            EntryFormState(
                entryId = 10,
                accountId = ACCOUNT_A,
                accountName = "Main",
                assetId = 5,
                assetDisplay = "AAPL — Apple",
                amount = "3",
            ),
        secondaryEntry =
            EntryFormState(
                entryId = 11,
                accountId = null,
                accountName = "",
                assetId = 1,
                assetDisplay = "GBP — Pound Sterling",
                amount = "100",
            ),
    )

private fun config(key: String) = getTransactionTypeConfig(key)

class TypeConversionTest {
    @Test
    fun sameTypeReturnsStateUnchanged() {
        val state = purchaseState("70")
        assertEquals(state, convertFormState(state, config("regular_transaction"), config("regular_transaction")))
    }

    @Test
    fun singleToSingleCarriesEntryAndUsesMagnitude() {
        val result = convertFormState(purchaseState("70"), config("regular_transaction"), config("cash_transfer_in"))
        assertEquals(ACCOUNT_A, result.primaryEntry.accountId)
        assertEquals(1, result.primaryEntry.assetId)
        assertEquals(42, result.primaryEntry.entryId)
        assertEquals("70", result.primaryEntry.amount)
    }

    @Test
    fun negativeSingleToPositiveSingleUsesMagnitude() {
        val result = convertFormState(purchaseState("-10"), config("regular_transaction"), config("cash_transfer_in"))
        assertEquals("10", result.primaryEntry.amount)
    }

    @Test
    fun fixedSignSingleToAnySignSingleRestoresTheSign() {
        val result = convertFormState(purchaseState("50"), config("cash_transfer_out"), config("regular_transaction"))
        assertEquals("-50", result.primaryEntry.amount)
    }

    @Test
    fun positiveSingleToDualFillsTheDestinationSlot() {
        val result = convertFormState(purchaseState("70"), config("regular_transaction"), config("cash_balance_transfer"))
        assertEquals(ACCOUNT_A, result.secondaryEntry.accountId)
        assertEquals(42, result.secondaryEntry.entryId)
        assertNull(result.primaryEntry.accountId)
        assertNull(result.primaryEntry.entryId)
    }

    @Test
    fun negativeSingleToDualFillsTheSourceSlot() {
        val result = convertFormState(purchaseState("-10"), config("regular_transaction"), config("cash_balance_transfer"))
        assertEquals(ACCOUNT_A, result.primaryEntry.accountId)
        assertEquals(42, result.primaryEntry.entryId)
        assertNull(result.secondaryEntry.accountId)
    }

    @Test
    fun sharedFieldsCollapseOntoPrimary() {
        val result = convertFormState(purchaseState("70"), config("regular_transaction"), config("cash_balance_transfer"))
        assertEquals("70", result.primaryEntry.amount)
        assertEquals(1, result.primaryEntry.assetId)
    }

    @Test
    fun blankAmountFallsBackToThePrimarySlot() {
        val result = convertFormState(purchaseState(""), config("regular_transaction"), config("cash_balance_transfer"))
        assertEquals(ACCOUNT_A, result.primaryEntry.accountId)
        assertNull(result.secondaryEntry.accountId)
    }

    @Test
    fun roundTripThroughADualTypeKeepsTheAccountAndSign() {
        val start = purchaseState("70")
        val dual = convertFormState(start, config("regular_transaction"), config("cash_balance_transfer"))
        val back = convertFormState(dual, config("cash_balance_transfer"), config("regular_transaction"))
        assertEquals(ACCOUNT_A, back.primaryEntry.accountId)
        assertEquals("70", back.primaryEntry.amount)
        assertEquals(42, back.primaryEntry.entryId)
    }

    @Test
    fun dualToSinglePrefersAPopulatedLegOverAnEmptyPrimary() {
        val dual = convertFormState(purchaseState("70"), config("regular_transaction"), config("cash_balance_transfer"))
        val result = convertFormState(dual, config("cash_balance_transfer"), config("cash_transfer_in"))
        assertEquals(ACCOUNT_A, result.primaryEntry.accountId)
        assertEquals("70", result.primaryEntry.amount)
    }

    @Test
    fun dualToSinglePicksTheSignMatchingLeg() {
        val result = convertFormState(buyAssetState(), config("asset_purchase"), config("cash_transfer_out"))
        assertEquals(1, result.primaryEntry.assetId)
        assertEquals(11, result.primaryEntry.entryId)
        assertEquals("100", result.primaryEntry.amount)
    }

    @Test
    fun dualToSingleUsesTheSameAccountWhenTheSourceSharedIt() {
        val result = convertFormState(buyAssetState(), config("asset_purchase"), config("cash_transfer_out"))
        assertEquals(ACCOUNT_A, result.primaryEntry.accountId)
    }

    @Test
    fun dualToDualIsPositional() {
        val result = convertFormState(buyAssetState(), config("asset_purchase"), config("asset_sale"))
        assertEquals(5, result.primaryEntry.assetId)
        assertEquals(10, result.primaryEntry.entryId)
        assertEquals("3", result.primaryEntry.amount)
        assertEquals(1, result.secondaryEntry.assetId)
        assertEquals(11, result.secondaryEntry.entryId)
        assertEquals("100", result.secondaryEntry.amount)
    }

    @Test
    fun sharedFieldsRetainDescriptionCategoryAndTransactionId() {
        val result = convertFormState(purchaseState("70"), config("regular_transaction"), config("cash_transfer_in"))
        assertEquals("CASHBACK", result.description)
        assertEquals(7, result.categoryId)
        assertEquals("tx-1", result.transactionId)
        assertEquals(1_753_000_000L, result.date)
    }
}
