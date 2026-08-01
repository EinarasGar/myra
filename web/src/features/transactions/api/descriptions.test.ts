import { describe, expect, it } from "vitest"

import type { RequiredIdentifiableTransaction } from "@/api"
import {
  TRANSACTION_TYPE_CONFIG,
  TRANSACTION_TYPES,
  type AnyTransactionTypeConfig,
} from "@/lib/domain/transaction-types"
import { NBSP } from "@/lib/format"

import { describeGroup, describeTransaction } from "./descriptions"
import {
  ACCOUNT_ISA,
  ASSET_GBP,
  ASSET_VUSA,
  assetPurchase,
  assetSale,
  assetTrade,
  cashBalanceTransfer,
  cashDividend,
  CATEGORY_GROCERIES,
  DAY,
  entry,
  lookupTables,
  regular,
} from "./fixtures"
import { toLookupIndex } from "./lookup"

const lookup = toLookupIndex(lookupTables)
const lookupWithoutCategories = toLookupIndex({
  ...lookupTables,
  categories: undefined,
})

function minimalTransaction(
  type: (typeof TRANSACTION_TYPES)[number]
): RequiredIdentifiableTransaction {
  const config: AnyTransactionTypeConfig = TRANSACTION_TYPE_CONFIG[type]
  const fields: Record<string, unknown> = {
    type,
    transaction_id: `tx-${type}`,
    date: DAY,
  }
  for (const slot of config.entries) {
    fields[slot.field] = entry(
      ACCOUNT_ISA,
      slot.amountKind === "cash" ? ASSET_GBP : ASSET_VUSA,
      slot.sign === "negative" ? -3 : 3
    )
  }
  if (type === "regular") fields.category_id = CATEGORY_GROCERIES
  if (type === "cash_dividend") fields.origin_asset_id = ASSET_VUSA
  return fields as unknown as RequiredIdentifiableTransaction
}

describe("describeTransaction", () => {
  it("keeps the stored description of a regular transaction", () => {
    expect(describeTransaction(regular(), lookup)).toEqual({
      primary: "Tesco",
      detail: null,
      source: "api",
    })
  })

  it("falls back to the category name when a regular transaction has no description", () => {
    expect(describeTransaction(regular({ description: null }), lookup)).toEqual(
      {
        primary: "Groceries",
        detail: null,
        source: "synthesised",
      }
    )
  })

  it("falls back again when the lookup tables omit categories", () => {
    expect(
      describeTransaction(
        regular({ description: "  " }),
        lookupWithoutCategories
      ).primary
    ).toBe("Transaction")
  })

  it("synthesises a purchase with units and implied unit price", () => {
    expect(describeTransaction(assetPurchase(), lookup)).toEqual({
      primary: "Buy VUSA.LSE",
      detail: "8.0000 units @ £84.10",
      source: "synthesised",
    })
  })

  it("synthesises a sale", () => {
    expect(describeTransaction(assetSale(), lookup)).toEqual({
      primary: "Sell VUSA.LSE",
      detail: "4.0000 units @ £85.00",
      source: "synthesised",
    })
  })

  it("omits the unit price when units are zero", () => {
    const zeroUnits = assetPurchase({
      purchase_change: entry(ACCOUNT_ISA, ASSET_VUSA, 0),
    })
    expect(describeTransaction(zeroUnits, lookup).detail).toBe("0.0000 units")
  })

  it("synthesises a trade from both legs", () => {
    expect(describeTransaction(assetTrade(), lookup)).toEqual({
      primary: "Trade BTC → VUSA.LSE",
      detail: `0.5000${NBSP}BTC → 12.0000${NBSP}VUSA.LSE`,
      source: "synthesised",
    })
  })

  it("names both accounts on a balance transfer", () => {
    expect(describeTransaction(cashBalanceTransfer(), lookup)).toEqual({
      primary: "Move GBP",
      detail: "Lloyds Current → Trading 212 ISA",
      source: "synthesised",
    })
  })

  it("names the paying asset on a cash dividend", () => {
    expect(describeTransaction(cashDividend(), lookup).primary).toBe(
      "Dividend from VUSA.LSE"
    )
  })

  it("degrades to an asset id when the lookup table is missing the asset", () => {
    const unknownAsset = assetPurchase({
      purchase_change: entry(ACCOUNT_ISA, 999, 2),
    })
    expect(describeTransaction(unknownAsset, lookup).primary).toBe(
      "Buy Asset 999"
    )
  })

  it("produces a non-empty primary line for every transaction type", () => {
    for (const type of TRANSACTION_TYPES) {
      const description = describeTransaction(minimalTransaction(type), lookup)
      expect(description.primary.length).toBeGreaterThan(0)
    }
  })
})

describe("describeGroup", () => {
  it("uses the stored group description", () => {
    expect(
      describeGroup(
        {
          item_type: "group",
          group_id: "g",
          date: DAY,
          description: "Weekly shop",
          category_id: CATEGORY_GROCERIES,
          transactions: [],
        },
        lookup
      )
    ).toEqual({ primary: "Weekly shop", detail: null, source: "api" })
  })

  it("falls back to the group category", () => {
    expect(
      describeGroup(
        {
          item_type: "group",
          group_id: "g",
          date: DAY,
          description: "   ",
          category_id: CATEGORY_GROCERIES,
          transactions: [],
        },
        lookup
      )
    ).toEqual({ primary: "Groceries", detail: null, source: "synthesised" })
  })
})

describe("missing lookup rows", () => {
  it("degrades to a placeholder when an account is missing from the lookup", () => {
    const detached = {
      ...cashBalanceTransfer(),
      outgoing_change: entry(
        "00000000-0000-0000-0000-0000000000ff",
        ASSET_GBP,
        -5
      ),
    } as RequiredIdentifiableTransaction
    expect(describeTransaction(detached, lookup).detail).toBe(
      "Unknown account → Trading 212 ISA"
    )
  })
})
