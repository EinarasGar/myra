import { describe, expect, it } from "vitest"

import { isCurrencyAsset } from "@/lib/domain/refs"

import { nativeFigureProps } from "./amounts"
import {
  at,
  ACCOUNT_CURRENT,
  ACCOUNT_ISA,
  ASSET_GBP,
  ASSET_USD,
  ASSET_VUSA,
  accountFees,
  assetPurchase,
  assetSale,
  assetTrade,
  cashBalanceTransfer,
  cashDividend,
  combinedPage,
  DAY,
  entry,
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} from "./fixtures"
import { mergeLookupIndexes, toLookupIndex } from "./lookup"
import { asTransaction, isGroupItem } from "./narrow"
import {
  groupRowsByDay,
  toGroupRow,
  toLedgerRows,
  toTransactionRow,
} from "./normalise"
import { assetUnitsOf, isGroupRow, isTransactionRow } from "./types"

const lookup = toLookupIndex(lookupTables)

describe("toTransactionRow", () => {
  it("resolves the primary leg from the shared type config", () => {
    const row = toTransactionRow(assetPurchase(), lookup)
    expect(row.primaryLeg?.amount.asset.ticker).toBe("GBP")
    expect(row.primaryAmount && assetUnitsOf(row.primaryAmount)).toBe(-672.8)
    expect(row.legs).toHaveLength(2)
    expect(row.legs.map((leg) => leg.role)).toEqual(["counter", "primary"])
  })

  it("uses the proceeds leg as the primary figure of a sale", () => {
    const row = toTransactionRow(assetSale(), lookup)
    expect(row.primaryAmount && assetUnitsOf(row.primaryAmount)).toBe(340)
    expect(
      row.primaryAmount ? isCurrencyAsset(row.primaryAmount.asset) : false
    ).toBe(true)
  })

  it("records leg direction", () => {
    const row = toTransactionRow(assetTrade(), lookup)
    expect(row.legs.map((leg) => leg.direction)).toEqual(["out", "in"])
  })

  it("marks the twelve categoryless types as unsupported rather than uncategorised", () => {
    expect(toTransactionRow(regular(), lookup).categorySupported).toBe(true)
    expect(toTransactionRow(regular(), lookup).category?.name).toBe("Groceries")
    expect(toTransactionRow(accountFees(), lookup).categorySupported).toBe(
      false
    )
    expect(toTransactionRow(accountFees(), lookup).category).toBeNull()
  })

  it("never exposes a base-currency amount", () => {
    const row = toTransactionRow(regular(), lookup)
    expect(row.baseCurrencyAmount).toEqual({
      available: false,
      reason: "no-transaction-level-conversion",
      gap: "D1",
    })
  })

  it("renders a currency leg as money and an asset leg as units", () => {
    const row = toTransactionRow(assetPurchase(), lookup)
    const assetLeg = at(row.legs, 0)
    const cashLeg = at(row.legs, 1)
    expect(nativeFigureProps(cashLeg.amount)).toEqual({
      value: -672.8,
      kind: "money",
      currency: "GBP",
    })
    expect(nativeFigureProps(assetLeg.amount)).toEqual({
      value: 8,
      kind: "units",
      ticker: "VUSA.LSE",
    })
  })

  it("carries fees with their own entry and account", () => {
    const withFee = assetPurchase({
      fees: [
        {
          account_id: ACCOUNT_ISA,
          asset_id: ASSET_GBP,
          amount: -1.5,
          entry_id: 900,
          fee_type: "transaction",
        },
      ],
    })
    const row = toTransactionRow(withFee, lookup)
    expect(row.fees).toHaveLength(1)
    expect(at(row.fees, 0).feeType).toBe("transaction")
    expect(at(row.fees, 0).account.name).toBe("Trading 212 ISA")
  })

  it("defaults an absent visibility to default and flags ghosts", () => {
    expect(toTransactionRow(regular(), lookup).visibility).toBe("default")
    const ghost = toTransactionRow(ghostTransfer(), lookup)
    expect(ghost.isUnreviewed).toBe(true)
    expect(ghost.figureIntent).toBe("ghost")
  })

  it("lists every account a multi-leg transaction touches, once", () => {
    const row = toTransactionRow(cashBalanceTransfer(), lookup)
    expect(row.accounts.map((account) => account.accountId)).toEqual([
      ACCOUNT_CURRENT,
      ACCOUNT_ISA,
    ])
  })

  it("names the type from the shared config", () => {
    expect(toTransactionRow(cashDividend(), lookup).typeName).toBe(
      "Cash dividend"
    )
  })
})

describe("toGroupRow", () => {
  it("takes the tone its children agree on, so a group of spending is not neutral", () => {
    const item = groupItem([regular(), regular({ transaction_id: "tx-two" })])
    if (!isGroupItem(item)) throw new Error("expected a group item")
    expect(toGroupRow(item, lookup).figureIntent).toBe("spending")
  })

  it("falls back to neutral when its children disagree", () => {
    const item = groupItem([regular(), assetPurchase()])
    if (!isGroupItem(item)) throw new Error("expected a group item")
    expect(toGroupRow(item, lookup).figureIntent).toBe("neutral")
  })

  it("stays ghost while any child is unreviewed", () => {
    const item = groupItem([regular(), ghostTransfer()])
    if (!isGroupItem(item)) throw new Error("expected a group item")
    expect(toGroupRow(item, lookup).figureIntent).toBe("ghost")
  })

  it("normalises children and totals them per asset", () => {
    const item = groupItem([regular(), assetPurchase()])
    if (!isGroupItem(item)) throw new Error("expected a group item")
    const row = toGroupRow(item, lookup)
    expect(row.childCount).toBe(2)
    expect(row.children.every((child) => child.groupId === "group-1")).toBe(
      true
    )
    expect(row.amountsByAsset.map((amount) => amount.asset.ticker)).toEqual([
      "GBP",
      "VUSA.LSE",
    ])
    expect(assetUnitsOf(at(row.amountsByAsset, 0))).toBeCloseTo(-714.98, 5)
    expect(assetUnitsOf(at(row.amountsByAsset, 1))).toBe(8)
  })

  it("is unreviewed when any child is", () => {
    const item = groupItem([regular(), ghostTransfer()])
    if (!isGroupItem(item)) throw new Error("expected a group item")
    expect(toGroupRow(item, lookup).isUnreviewed).toBe(true)
  })
})

describe("toLedgerRows", () => {
  it("splits the untagged union into typed rows", () => {
    const rows = toLedgerRows(
      [individualItem(regular()), groupItem([assetPurchase()])],
      lookup
    )
    expect(rows.filter(isTransactionRow)).toHaveLength(1)
    expect(rows.filter(isGroupRow)).toHaveLength(1)
  })

  it("drops an item whose type tag the client does not know", () => {
    const rows = toLedgerRows(
      [
        {
          item_type: "individual",
          type: "teleportation",
          transaction_id: "tx-unknown",
          date: DAY,
        } as never,
        individualItem(regular()),
      ],
      lookup
    )
    expect(rows).toHaveLength(1)
  })
})

describe("asTransaction", () => {
  it("rejects a group item", () => {
    expect(asTransaction(groupItem([regular()]))).toBeNull()
  })

  it("accepts an individual item and keeps its tag", () => {
    expect(asTransaction(individualItem(assetSale()))?.type).toBe("asset_sale")
  })
})

describe("groupRowsByDay", () => {
  it("nets only currency legs, one figure per currency", () => {
    const usdRow = toTransactionRow(
      regular({
        transaction_id: "tx-usd",
        entry: entry(ACCOUNT_CURRENT, ASSET_USD, -20),
      }),
      lookup
    )
    const days = groupRowsByDay([
      toTransactionRow(assetPurchase(), lookup),
      usdRow,
    ])
    expect(days).toHaveLength(1)
    expect(
      at(days, 0).netByCurrency.map((amount) => [
        amount.asset.ticker,
        assetUnitsOf(amount),
      ])
    ).toEqual([
      ["GBP", -672.8],
      ["USD", -20],
    ])
  })

  it("includes fee entries in the day net", () => {
    const withFee = assetPurchase({
      fees: [
        {
          account_id: ACCOUNT_ISA,
          asset_id: ASSET_GBP,
          amount: -1.2,
          entry_id: 901,
          fee_type: "transaction",
        },
      ],
    })
    const day = at(groupRowsByDay([toTransactionRow(withFee, lookup)]), 0)
    expect(assetUnitsOf(at(day.netByCurrency, 0))).toBeCloseTo(-674, 5)
  })

  it("leaves hidden rows out of the net but keeps them in the day", () => {
    const hidden = toTransactionRow(
      regular({ transaction_id: "tx-hidden", visibility: "hidden" }),
      lookup
    )
    const day = at(groupRowsByDay([hidden]), 0)
    expect(day.rows).toHaveLength(1)
    expect(day.netByCurrency).toEqual([])
  })

  it("splits rows across calendar days in order of arrival", () => {
    const later = toTransactionRow(
      regular({ transaction_id: "tx-later", date: DAY + 86_400 }),
      lookup
    )
    const days = groupRowsByDay([later, toTransactionRow(regular(), lookup)])
    expect(days).toHaveLength(2)
    expect(at(at(days, 0).rows, 0).rowId).toBe("tx-later")
  })
})

describe("lookup index", () => {
  it("lets a later page correct an earlier one", () => {
    const stale = toLookupIndex({
      accounts: [
        { account_id: ACCOUNT_ISA, account_type: 0, name: "placeholder" },
      ],
      assets: [],
    })
    const merged = mergeLookupIndexes([stale, lookup])
    expect(merged.accounts.get(ACCOUNT_ISA)?.name).toBe("Trading 212 ISA")
    expect(merged.categoriesProvided).toBe(true)
  })

  it("reports when a response carried no categories at all", () => {
    const page = combinedPage([], {
      lookup_tables: { ...lookupTables, categories: undefined },
    })
    expect(toLookupIndex(page.lookup_tables).categoriesProvided).toBe(false)
  })

  it("marks currency assets from their asset type", () => {
    const gbp = lookup.assets.get(ASSET_GBP)
    const vusa = lookup.assets.get(ASSET_VUSA)
    expect(gbp && isCurrencyAsset(gbp)).toBe(true)
    expect(vusa && isCurrencyAsset(vusa)).toBe(false)
  })
})
