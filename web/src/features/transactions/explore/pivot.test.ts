import { describe, expect, it } from "vitest"

import type { LedgerRow, NativeAmount } from "../api"
import {
  assetUnitsOf,
  groupRowsByDay,
  sumByAsset,
  toLedgerRows,
  toLookupIndex,
} from "../api"
import {
  accountFees,
  ACCOUNT_CURRENT,
  ASSET_GBP,
  ASSET_USD,
  cashDividend,
  entry,
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} from "../api/fixtures"

import {
  MERCHANT_UNSUPPORTED,
  MIXED_CURRENCY_SHARE_NOTE,
  NO_CATEGORY_LABEL,
  pivotRows,
  ledgerCurrencyAmounts,
  transactionRowIndex,
  visibleTransactionIds,
} from "./pivot"

const lookup = toLookupIndex(lookupTables)

function rows(): LedgerRow[] {
  return toLedgerRows(
    [
      individualItem(
        regular({
          fees: [
            {
              account_id: ACCOUNT_CURRENT,
              asset_id: ASSET_GBP,
              amount: -1.5,
              entry_id: 900,
              fee_type: "transaction",
            },
          ],
        })
      ),
      individualItem(cashDividend()),
      individualItem(accountFees()),
      individualItem(ghostTransfer()),
      groupItem([regular({ transaction_id: "tx-a" }), accountFees()]),
    ],
    lookup
  )
}

function amountsOf(totals: readonly NativeAmount[]) {
  return totals.map((total) => [
    total.asset.ticker,
    Math.round(assetUnitsOf(total) * 100) / 100,
  ])
}

describe("grouping by day", () => {
  it("gives every band the same net the ledger layer computes", () => {
    const all = rows()
    const days = groupRowsByDay(all)
    const pivot = pivotRows(all, "day")

    expect(pivot.groups).toHaveLength(days.length)
    expect(days.length).toBeGreaterThan(0)
    for (const [index, group] of pivot.groups.entries()) {
      const day = days[index]
      const independentNet = sumByAsset(
        (day?.rows ?? []).flatMap(ledgerCurrencyAmounts)
      )
      expect(group.totals.length).toBeGreaterThan(0)
      expect(amountsOf(group.totals)).toEqual(amountsOf(independentNet))
    }
  })

  it("counts the transactions inside a group row, not the row", () => {
    const pivot = pivotRows(rows(), "day")
    expect(pivot.groups[0]?.transactionCount).toBe(6)
    expect(pivot.groups[0]?.rows).toHaveLength(5)
  })

  it("draws no share bars, because a day is not a share of anything", () => {
    for (const group of pivotRows(rows(), "day").groups) {
      expect(group.share).toBeNull()
    }
  })
})

describe("what the drawer can step through", () => {
  it("walks the transactions in the order they are painted", () => {
    const groups = pivotRows(rows(), "day").groups
    expect(visibleTransactionIds(groups, new Set())).toEqual([
      "tx-regular",
      "tx-dividend",
      "tx-fee",
      "tx-ghost",
    ])
  })

  it("adds a group's children only once the group is open", () => {
    const groups = pivotRows(rows(), "day").groups
    expect(visibleTransactionIds(groups, new Set(["group-1"]))).toEqual([
      "tx-regular",
      "tx-dividend",
      "tx-fee",
      "tx-ghost",
      "tx-a",
      "tx-fee",
    ])
  })

  it("re-walks in the pivot's order, not the ledger's", () => {
    const byType = pivotRows(rows(), "type").groups
    const ids = visibleTransactionIds(byType, new Set())
    expect([...ids].sort()).toEqual(
      ["tx-regular", "tx-dividend", "tx-fee", "tx-ghost"].sort()
    )
    expect(ids).not.toEqual(
      visibleTransactionIds(pivotRows(rows(), "day").groups, new Set())
    )
  })

  it("indexes every loaded transaction, open group or not", () => {
    const index = transactionRowIndex(pivotRows(rows(), "day").groups)
    expect(Object.keys(index).sort()).toEqual(
      ["tx-a", "tx-dividend", "tx-fee", "tx-ghost", "tx-regular"].sort()
    )
    expect(index["tx-regular"]?.description.primary).toBe("Tesco")
  })
})

describe("grouping by a dimension the rows carry", () => {
  it("files a transaction under the account of its primary entry", () => {
    const pivot = pivotRows(rows(), "account")
    const labels = pivot.groups.map((group) => group.label)
    expect(labels).toContain("Lloyds Current")
    expect(labels).toContain("Trading 212 ISA")
    expect(
      pivot.groups.reduce((total, group) => total + group.rows.length, 0)
    ).toBe(rows().length)
    expect(pivot.note).toContain("primary entry")
  })

  it("names the types it groups and calls a group a Group", () => {
    const labels = pivotRows(rows(), "type").groups.map((group) => group.label)
    expect(labels).toContain("Purchase")
    expect(labels).toContain("Group")
  })

  it("says out loud that most types carry no category", () => {
    const pivot = pivotRows(rows(), "category")
    const labels = pivot.groups.map((group) => group.label)
    expect(labels).toContain("Groceries")
    expect(labels).toContain(NO_CATEGORY_LABEL)
    expect(pivot.note).toContain("No category")
  })

  it("orders groups by how much money moved through them", () => {
    const pivot = pivotRows(rows(), "type")
    const sizes = pivot.groups.map((group) =>
      Math.max(...group.totals.map((total) => Math.abs(assetUnitsOf(total))), 0)
    )
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
  })

  it("scales share bars against the largest group when one currency is in play", () => {
    const pivot = pivotRows(rows(), "type")
    expect(pivot.shareNote).toBeNull()
    expect(pivot.groups[0]?.share).toBe(1)
    for (const group of pivot.groups) {
      expect(group.share).not.toBeNull()
      expect(group.share ?? 0).toBeGreaterThanOrEqual(0)
      expect(group.share ?? 0).toBeLessThanOrEqual(1)
    }
  })

  it("withholds share bars rather than compare two currencies", () => {
    const mixed = toLedgerRows(
      [
        individualItem(regular()),
        individualItem(
          regular({
            transaction_id: "tx-usd",
            entry: entry(ACCOUNT_CURRENT, ASSET_USD, -30),
          })
        ),
      ],
      lookup
    )
    const pivot = pivotRows(mixed, "account")
    expect(pivot.shareNote).toBe(MIXED_CURRENCY_SHARE_NOTE)
    for (const group of pivot.groups) expect(group.share).toBeNull()
  })
})

describe("grouping by merchant", () => {
  it("refuses instead of inventing merchants", () => {
    const pivot = pivotRows(rows(), "merchant")
    expect(pivot.unsupported).toBe(MERCHANT_UNSUPPORTED)
    expect(pivot.groups).toEqual([])
  })
})

describe("what a row contributes to a subtotal", () => {
  it("counts currency entries and fees, and never a non-currency holding", () => {
    const [purchase] = toLedgerRows(
      [
        individualItem({
          type: "asset_purchase",
          transaction_id: "tx-buy",
          date: 1_753_920_000,
          purchase_change: entry(ACCOUNT_CURRENT, 40, 8),
          cash_outgoings_change: entry(ACCOUNT_CURRENT, 1, -672.8),
        }),
      ],
      lookup
    )
    expect(purchase).toBeDefined()
    expect(amountsOf(ledgerCurrencyAmounts(purchase!))).toEqual([
      ["GBP", -672.8],
    ])
  })

  it("leaves a hidden transaction out of every subtotal", () => {
    const [hidden] = toLedgerRows(
      [individualItem(regular({ visibility: "hidden" }))],
      lookup
    )
    expect(hidden).toBeDefined()
    expect(ledgerCurrencyAmounts(hidden!)).toEqual([])
  })
})
