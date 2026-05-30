package com.sverto.app.feature.accounts

import com.sverto.app.feature.portfolio.ChartPoint
import uniffi.sverto_core.TransactionListItem

enum class AccountType(
    val label: String,
) {
    CURRENT("Current Account"),
    BROKERAGE("Brokerage"),
    SAVINGS("Savings"),
}

data class MockAccount(
    val id: String,
    val name: String,
    val type: AccountType,
    val balance: Double,
    val gainAmount: Double?,
    val gainPercent: Double?,
    val holdingsCount: Int?,
    val income: Double?,
    val expenses: Double?,
)

data class MockHolding(
    val id: String,
    val ticker: String,
    val name: String,
    val units: Double,
    val currentValue: Double,
    val gainPercent: Double,
    val costBasis: Double,
    val unrealizedPnl: Double,
    val totalFees: Double,
    val currentPrice: Double,
    val lots: List<MockLot>,
)

data class MockLot(
    val units: Double,
    val buyDate: String,
    val buyPricePerUnit: Double,
    val gainPercent: Double,
    val pnl: Double,
    val currentValue: Double,
)

data class AccountDetailData(
    val account: MockAccount,
    val chartData: Map<String, List<ChartPoint>>,
    val totalValue: Double?,
    val costBasis: Double?,
    val unrealizedPnl: Double?,
    val totalFees: Double?,
    val holdings: List<MockHolding>,
    val recentTransactions: List<TransactionListItem>,
)

data class AssetDetailData(
    val holding: MockHolding,
    val priceChartData: Map<String, List<ChartPoint>>,
)

object MockData {
    val accounts =
        listOf(
            MockAccount(
                id = "acc-1",
                name = "Main Current",
                type = AccountType.CURRENT,
                balance = 12_340.0,
                gainAmount = null,
                gainPercent = null,
                holdingsCount = null,
                income = 4_200.0,
                expenses = 2_890.0,
            ),
            MockAccount(
                id = "acc-2",
                name = "IBKR Portfolio",
                type = AccountType.BROKERAGE,
                balance = 98_210.0,
                gainAmount = 10_820.0,
                gainPercent = 12.4,
                holdingsCount = 5,
                income = null,
                expenses = null,
            ),
            MockAccount(
                id = "acc-3",
                name = "Emergency Fund",
                type = AccountType.SAVINGS,
                balance = 16_900.0,
                gainAmount = null,
                gainPercent = null,
                holdingsCount = null,
                income = null,
                expenses = null,
            ),
        )

    val totalNetWorth: Double get() = accounts.sumOf { it.balance }

    val holdings =
        listOf(
            MockHolding(
                id = "hld-1",
                ticker = "VOO",
                name = "Vanguard S&P 500 ETF",
                units = 42.5,
                currentValue = 52_400.0,
                gainPercent = 15.2,
                costBasis = 45_480.0,
                unrealizedPnl = 6_920.0,
                totalFees = 32.0,
                currentPrice = 523.47,
                lots =
                    listOf(
                        MockLot(20.0, "Jan 15, 2025", 427.80, 22.4, 1_913.0, 10_469.0),
                        MockLot(15.0, "Jun 3, 2025", 467.00, 12.1, 847.0, 7_852.0),
                        MockLot(7.5, "Apr 20, 2026", 533.00, -1.8, -72.0, 3_926.0),
                    ),
            ),
            MockHolding(
                id = "hld-2",
                ticker = "AAPL",
                name = "Apple Inc.",
                units = 28.0,
                currentValue = 31_200.0,
                gainPercent = 8.7,
                costBasis = 28_700.0,
                unrealizedPnl = 2_500.0,
                totalFees = 18.0,
                currentPrice = 1_114.29,
                lots =
                    listOf(
                        MockLot(28.0, "Mar 10, 2025", 1_025.00, 8.7, 2_500.0, 31_200.0),
                    ),
            ),
            MockHolding(
                id = "hld-3",
                ticker = "MSFT",
                name = "Microsoft Corp.",
                units = 12.0,
                currentValue = 8_400.0,
                gainPercent = 5.1,
                costBasis = 7_992.0,
                unrealizedPnl = 408.0,
                totalFees = 12.0,
                currentPrice = 700.00,
                lots =
                    listOf(
                        MockLot(12.0, "Aug 22, 2025", 666.00, 5.1, 408.0, 8_400.0),
                    ),
            ),
            MockHolding(
                id = "hld-4",
                ticker = "BND",
                name = "Vanguard Total Bond",
                units = 50.0,
                currentValue = 4_800.0,
                gainPercent = -0.8,
                costBasis = 4_838.0,
                unrealizedPnl = -38.0,
                totalFees = 8.0,
                currentPrice = 96.00,
                lots =
                    listOf(
                        MockLot(50.0, "Nov 5, 2025", 96.76, -0.8, -38.0, 4_800.0),
                    ),
            ),
            MockHolding(
                id = "hld-5",
                ticker = "USD",
                name = "Cash (USD)",
                units = 1_410.0,
                currentValue = 1_410.0,
                gainPercent = 0.0,
                costBasis = 1_410.0,
                unrealizedPnl = 0.0,
                totalFees = 0.0,
                currentPrice = 1.0,
                lots = emptyList(),
            ),
        )

    private val brokerageTransactions =
        listOf(
            TransactionListItem(
                id = "tx-1",
                date = 1_746_662_400L,
                description = "Buy VOO",
                transactionType = "asset_purchase",
                typeLabel = "Asset Purchase",
                amountDisplay = "-£2,450.00",
                accountName = "IBKR Portfolio",
                assetDisplay = "VOO",
                categoryName = "",
                categoryId = null,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-2",
                date = 1_746_057_600L,
                description = "Dividend AAPL",
                transactionType = "cash_dividend",
                typeLabel = "Cash Dividend",
                amountDisplay = "+£48.20",
                accountName = "IBKR Portfolio",
                assetDisplay = "AAPL",
                categoryName = "",
                categoryId = null,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-3",
                date = 1_745_452_800L,
                description = "Account Fee",
                transactionType = "account_fees",
                typeLabel = "Account Fee",
                amountDisplay = "-£4.50",
                accountName = "IBKR Portfolio",
                assetDisplay = "",
                categoryName = "",
                categoryId = null,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-4",
                date = 1_744_848_000L,
                description = "Buy MSFT",
                transactionType = "asset_purchase",
                typeLabel = "Asset Purchase",
                amountDisplay = "-£7,992.00",
                accountName = "IBKR Portfolio",
                assetDisplay = "MSFT",
                categoryName = "",
                categoryId = null,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-5",
                date = 1_744_243_200L,
                description = "Transfer In",
                transactionType = "cash_transfer_in",
                typeLabel = "Cash Transfer In",
                amountDisplay = "+£10,000.00",
                accountName = "IBKR Portfolio",
                assetDisplay = "",
                categoryName = "",
                categoryId = null,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
        )

    private val currentAccountTransactions =
        listOf(
            TransactionListItem(
                id = "tx-c1",
                date = 1_746_662_400L,
                description = "Salary May",
                transactionType = "cash_transfer_in",
                typeLabel = "Cash Transfer In",
                amountDisplay = "+£4,200.00",
                accountName = "Main Current",
                assetDisplay = "",
                categoryName = "Income",
                categoryId = 1,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-c2",
                date = 1_746_576_000L,
                description = "Grocery Store",
                transactionType = "cash_transfer_out",
                typeLabel = "Cash Transfer Out",
                amountDisplay = "-£87.50",
                accountName = "Main Current",
                assetDisplay = "",
                categoryName = "Groceries",
                categoryId = 2,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-c3",
                date = 1_746_489_600L,
                description = "Electric Bill",
                transactionType = "cash_transfer_out",
                typeLabel = "Cash Transfer Out",
                amountDisplay = "-£142.00",
                accountName = "Main Current",
                assetDisplay = "",
                categoryName = "Utilities",
                categoryId = 3,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-c4",
                date = 1_745_884_800L,
                description = "Netflix Subscription",
                transactionType = "cash_transfer_out",
                typeLabel = "Cash Transfer Out",
                amountDisplay = "-£15.99",
                accountName = "Main Current",
                assetDisplay = "",
                categoryName = "Subscriptions",
                categoryId = 4,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
            TransactionListItem(
                id = "tx-c5",
                date = 1_745_280_000L,
                description = "Transfer to Savings",
                transactionType = "cash_transfer_out",
                typeLabel = "Cash Transfer Out",
                amountDisplay = "-£500.00",
                accountName = "Main Current",
                assetDisplay = "",
                categoryName = "",
                categoryId = null,
                isGroup = false,
                groupSize = 0u,
                children = emptyList(),
            ),
        )

    fun transactionsForAccount(accountId: String): List<TransactionListItem> =
        when (accountId) {
            "acc-1" -> currentAccountTransactions
            "acc-2" -> brokerageTransactions
            "acc-3" -> currentAccountTransactions.take(2)
            else -> emptyList()
        }

    fun generateChartData(): Map<String, List<ChartPoint>> {
        val now = System.currentTimeMillis() / 1000
        return mapOf(
            "1d" to generatePoints(now, 24, 3600L, 98_000.0, 200.0),
            "1w" to generatePoints(now, 7, 86400L, 97_000.0, 500.0),
            "1m" to generatePoints(now, 30, 86400L, 95_000.0, 1000.0),
            "3m" to generatePoints(now, 90, 86400L, 90_000.0, 3000.0),
            "6m" to generatePoints(now, 180, 86400L, 85_000.0, 5000.0),
            "1y" to generatePoints(now, 365, 86400L, 75_000.0, 10000.0),
            "all" to generatePoints(now, 730, 86400L, 50_000.0, 20000.0),
        )
    }

    fun generatePriceChartData(basePrice: Double): Map<String, List<ChartPoint>> {
        val now = System.currentTimeMillis() / 1000
        val variance = basePrice * 0.15
        return mapOf(
            "1d" to generatePoints(now, 24, 3600L, basePrice - variance * 0.02, variance * 0.02),
            "1w" to generatePoints(now, 7, 86400L, basePrice - variance * 0.05, variance * 0.05),
            "1m" to generatePoints(now, 30, 86400L, basePrice - variance * 0.1, variance * 0.1),
            "3m" to generatePoints(now, 90, 86400L, basePrice - variance * 0.2, variance * 0.2),
            "6m" to generatePoints(now, 180, 86400L, basePrice - variance * 0.4, variance * 0.4),
            "1y" to generatePoints(now, 365, 86400L, basePrice - variance * 0.7, variance * 0.7),
            "all" to generatePoints(now, 730, 86400L, basePrice - variance, variance),
        )
    }

    private fun generatePoints(
        endTimestamp: Long,
        count: Int,
        intervalSecs: Long,
        startValue: Double,
        totalGrowth: Double,
    ): List<ChartPoint> {
        val startTime = endTimestamp - (count * intervalSecs)
        return (0 until count).map { i ->
            val progress = i.toDouble() / (count - 1).coerceAtLeast(1)
            val noise = (Math.random() - 0.5) * totalGrowth * 0.1
            ChartPoint(
                date = startTime + (i * intervalSecs),
                value = startValue + (totalGrowth * progress) + noise,
            )
        }
    }
}
