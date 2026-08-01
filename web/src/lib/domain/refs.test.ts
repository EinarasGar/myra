import { describe, expect, it } from "vitest"

import type { AssetAssetRequiredAssetTypeIdWithId } from "@/api"
import { toPortfolioLookups } from "@/features/portfolio/api"
import { toLookupIndex } from "@/features/transactions/api"
import { indexAccounts, indexAssets } from "@/lib/domain/refs"

import {
  accountLabel,
  assetLabel,
  CURRENCY_ASSET_TYPE_ID,
  isCurrencyAsset,
  isCurrencyAssetType,
  toAccountRef,
  toAssetPairRef,
  toAssetRef,
  toCategory,
  unresolvedAccountRef,
  unresolvedAssetRef,
} from "./refs"

const ACCOUNT = "11111111-1111-1111-1111-111111111111"

const gbp: AssetAssetRequiredAssetTypeIdWithId = {
  asset_id: 1,
  asset_type: 1,
  name: "Pound Sterling",
  ticker: "GBP",
}

describe("asset refs", () => {
  it("keeps the wire row's descriptors and its asset type", () => {
    expect(toAssetRef(gbp)).toEqual({
      assetId: 1,
      ticker: "GBP",
      name: "Pound Sterling",
      assetTypeId: 1,
    })
  })

  it("admits that a pair row carries no asset type", () => {
    const ref = toAssetPairRef({ asset_id: 1, ticker: "GBP", name: "Pound" })
    expect(ref.assetTypeId).toBeNull()
    expect(isCurrencyAsset(ref)).toBe(false)
  })

  it("carries only the id when the lookup table never mentioned the asset", () => {
    expect(unresolvedAssetRef(9)).toEqual({
      assetId: 9,
      ticker: null,
      name: null,
      assetTypeId: null,
    })
  })

  it("labels by ticker, then name, then id", () => {
    expect(assetLabel(toAssetRef(gbp))).toBe("GBP")
    expect(assetLabel({ ...toAssetRef(gbp), ticker: null })).toBe(
      "Pound Sterling"
    )
    expect(assetLabel(unresolvedAssetRef(9))).toBe("Asset 9")
  })

  it("decides currency from the seeded asset type alone", () => {
    expect(CURRENCY_ASSET_TYPE_ID).toBe(1)
    expect(isCurrencyAsset(toAssetRef(gbp))).toBe(true)
    expect(isCurrencyAsset(toAssetRef({ ...gbp, asset_type: 5 }))).toBe(false)
    expect(isCurrencyAssetType(undefined)).toBe(false)
  })
})

describe("account refs", () => {
  it("classifies the account while normalising it", () => {
    expect(
      toAccountRef({
        account_id: ACCOUNT,
        account_type: 7,
        name: "Halifax Mortgage",
      })
    ).toEqual({
      accountId: ACCOUNT,
      name: "Halifax Mortgage",
      accountTypeId: 7,
      accountClass: "liabilities",
      isLiability: true,
    })
  })

  it("falls back to the unclassified group when the account is unknown", () => {
    expect(unresolvedAccountRef(ACCOUNT)).toEqual({
      accountId: ACCOUNT,
      name: null,
      accountTypeId: null,
      accountClass: "other",
      isLiability: false,
    })
    expect(accountLabel(unresolvedAccountRef(ACCOUNT))).toBe("Unknown account")
  })
})

describe("one ref shape for the whole app", () => {
  const tables = {
    accounts: [{ account_id: ACCOUNT, account_type: 7, name: "Halifax" }],
    assets: [gbp],
  }

  it("resolves an asset and an account identically through the ledger and portfolio pipelines", () => {
    const ledger = toLookupIndex(tables)
    const portfolio = toPortfolioLookups(tables)

    expect(ledger.assets.get(1)).toEqual(portfolio.assetsById[1])
    expect(ledger.accounts.get(ACCOUNT)).toEqual(
      portfolio.accountsById[ACCOUNT]
    )
    expect(ledger.accounts.get(ACCOUNT)?.isLiability).toBe(true)
  })

  it("gives the ledger the same category row the catalogue holds", () => {
    const wire = {
      id: 12,
      category: "Groceries",
      category_type: 2,
      icon: "basket",
      is_global: true,
      is_system: false,
    }
    const ledger = toLookupIndex({ ...tables, categories: [wire] })

    expect(ledger.categories.get(12)).toEqual({
      id: 12,
      name: "Groceries",
      icon: "basket",
      typeId: 2,
      isGlobal: true,
      isSystem: false,
    })
    expect(ledger.categories.get(12)).toEqual(toCategory(wire))
  })
})

describe("indexes", () => {
  it("keys refs by their id and leaves an absent id undefined", () => {
    expect(indexAssets([gbp])[1]?.ticker).toBe("GBP")
    expect(indexAssets([gbp])[2]).toBeUndefined()
    expect(
      indexAccounts([
        { account_id: ACCOUNT, account_type: 1, name: "Current" },
      ])[ACCOUNT]?.accountClass
    ).toBe("cash")
  })
})
