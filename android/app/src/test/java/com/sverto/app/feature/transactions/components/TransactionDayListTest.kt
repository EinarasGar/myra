package com.sverto.app.feature.transactions.components

import org.junit.Assert.assertEquals
import org.junit.Test
import uniffi.sverto_core.TransactionListItem
import uniffi.sverto_core.TransactionVisibility
import java.time.LocalDate
import java.time.ZoneId

class TransactionDayListTest {
    private fun epochOf(date: LocalDate): Long = date.atStartOfDay(ZoneId.systemDefault()).toEpochSecond()

    private fun item(
        id: String,
        date: LocalDate,
    ) = TransactionListItem(
        id = id,
        date = epochOf(date),
        description = "tx $id",
        transactionType = "purchase",
        typeLabel = "Purchase",
        amountDisplay = "-10.00 EUR",
        secondaryAmountDisplay = null,
        accountName = "Current",
        secondaryAccountName = null,
        assetDisplay = "EUR",
        categoryName = "Groceries",
        categoryId = 25,
        categoryIcon = "shopping-cart",
        visibility = TransactionVisibility.DEFAULT,
        isGroup = false,
        groupSize = 0u,
        children = emptyList(),
    )

    @Test
    fun labelsTodayYesterdayAndAbsoluteDates() {
        val today = LocalDate.of(2026, 7, 26)
        val items =
            listOf(
                item("1", today),
                item("2", today.minusDays(1)),
                item("3", LocalDate.of(2026, 7, 19)),
            )

        val grouped = groupByDate(items, today)

        assertEquals(listOf("Today", "Yesterday", "Jul 19, 2026"), grouped.map { it.first })
    }

    @Test
    fun collapsesSameDayItemsIntoOneBucket() {
        val today = LocalDate.of(2026, 7, 26)
        val items =
            listOf(
                item("1", today),
                item("2", today),
                item("3", today.minusDays(1)),
            )

        val grouped = groupByDate(items, today)

        assertEquals(2, grouped.size)
        assertEquals(listOf("1", "2"), grouped[0].second.map { it.id })
        assertEquals(listOf("3"), grouped[1].second.map { it.id })
    }

    @Test
    fun returnsEmptyListForEmptyInput() {
        val today = LocalDate.of(2026, 7, 26)

        val grouped = groupByDate(emptyList(), today)

        assertEquals(emptyList<Pair<String, List<TransactionListItem>>>(), grouped)
    }

    @Test
    fun labelsYearBoundaryDatesWithFullYear() {
        val today = LocalDate.of(2026, 7, 26)
        val items =
            listOf(
                item("1", LocalDate.of(2025, 12, 31)),
                item("2", LocalDate.of(2026, 1, 1)),
            )

        val grouped = groupByDate(items, today)

        assertEquals(listOf("Dec 31, 2025", "Jan 1, 2026"), grouped.map { it.first })
    }
}
