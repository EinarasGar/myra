import { describe, expect, it } from "vitest"

import type { GetHoldingsResponse } from "@/api"

import { buildHoldingsView } from "./holdings"

const CURRENT = "11111111-1111-1111-1111-111111111111"
const MORTGAGE = "22222222-2222-2222-2222-222222222222"

const response: GetHoldingsResponse = {
  holdings: [
    { account_id: CURRENT, asset_id: 1, units: 4200, value: 4200 },
    { account_id: CURRENT, asset_id: 2, units: 0.25, value: 8000 },
    { account_id: MORTGAGE, asset_id: 1, units: -144722.37, value: -144722.37 },
    { account_id: MORTGAGE, asset_id: 9, units: 1, value: null },
  ],
  lookup_tables: {
    accounts: [
      { account_id: CURRENT, account_type: 1, name: "Lloyds Current" },
      { account_id: MORTGAGE, account_type: 7, name: "Halifax Mortgage" },
    ],
    assets: [
      { asset_id: 1, asset_type: 1, name: "Pound Sterling", ticker: "GBP" },
      { asset_id: 2, asset_type: 7, name: "Bitcoin", ticker: "BTC" },
    ],
  },
}

describe("buildHoldingsView", () => {
  const view = buildHoldingsView(response)

  it("joins each holding to the lookup tables it arrived with", () => {
    expect(view.holdings[0]?.asset).toEqual({
      assetId: 1,
      ticker: "GBP",
      name: "Pound Sterling",
      assetTypeId: 1,
    })
    expect(view.holdings[0]?.account).toMatchObject({
      name: "Lloyds Current",
      accountClass: "cash",
      isLiability: false,
    })
    expect(view.holdings[2]?.account).toMatchObject({
      accountClass: "liabilities",
      isLiability: true,
    })
  })

  it("keeps a rateless value null instead of zero", () => {
    const rateless = view.holdings.find((holding) => holding.assetId === 9)
    expect(rateless?.value).toBeNull()
    expect(view.ratelessCount).toBe(1)
    expect(view.isDegraded).toBe(true)
  })

  it("leaves an unknown asset unresolved rather than inventing one", () => {
    expect(view.holdings.find((holding) => holding.assetId === 9)?.asset).toBe(
      null
    )
  })

  it("totals only the values that exist", () => {
    expect(view.totalValue).toBeCloseTo(4200 + 8000 - 144722.37, 6)
  })

  it("groups by account, negative balances included", () => {
    expect(view.byAccountId[CURRENT]?.value).toBe(12200)
    expect(view.byAccountId[MORTGAGE]?.value).toBeCloseTo(-144722.37, 6)
    expect(view.byAccountId[MORTGAGE]?.ratelessCount).toBe(1)
    expect(view.byAccount.map((entry) => entry.accountId)).toEqual([
      CURRENT,
      MORTGAGE,
    ])
  })

  it("groups by asset across accounts", () => {
    const gbp = view.byAssetId[1]
    expect(gbp?.accountCount).toBe(2)
    expect(gbp?.units).toBeCloseTo(4200 - 144722.37, 6)
  })

  it("states that the figures already carry the ownership share", () => {
    expect(view.appliesOwnershipShare).toBe(true)
  })

  it("handles an empty portfolio", () => {
    const empty = buildHoldingsView({
      holdings: [],
      lookup_tables: { accounts: [], assets: [] },
    })
    expect(empty.totalValue).toBe(0)
    expect(empty.isDegraded).toBe(false)
    expect(empty.byAccount).toEqual([])
  })
})

describe("wire decimals arriving as strings", () => {
  it("adds them instead of concatenating them", () => {
    const view = buildHoldingsView({
      ...response,
      holdings: [
        {
          account_id: CURRENT,
          asset_id: 1,
          units: "4200.00",
          value: "4200.00",
        },
        {
          account_id: MORTGAGE,
          asset_id: 1,
          units: "-144722.37",
          value: "-144722.37",
        },
      ],
    } as unknown as GetHoldingsResponse)

    expect(view.totalValue).toBeCloseTo(-140522.37, 2)
    expect(view.byAssetId[1]?.units).toBeCloseTo(-140522.37, 2)
    expect(Number.isNaN(view.totalValue)).toBe(false)
  })

  it("reads a missing value as no value, never as a zero holding", () => {
    const view = buildHoldingsView({
      ...response,
      holdings: [{ account_id: CURRENT, asset_id: 9, units: "1", value: null }],
    } as unknown as GetHoldingsResponse)

    expect(view.holdings[0]?.value).toBeNull()
    expect(view.ratelessCount).toBe(1)
  })
})
