import { describe, expect, it } from "vitest"

import type { GetAccountResponse, GetAccountsResponse } from "@/api"

import { buildAccountDetail, buildAccountsView } from "./accounts"

const CURRENT = "11111111-1111-1111-1111-111111111111"
const JOINT = "22222222-2222-2222-2222-222222222222"
const ISA = "33333333-3333-3333-3333-333333333333"
const HOUSE = "44444444-4444-4444-4444-444444444444"
const MORTGAGE = "55555555-5555-5555-5555-555555555555"

const response: GetAccountsResponse = {
  accounts: [
    {
      account_id: MORTGAGE,
      account_type: 7,
      liquidity_type: 1,
      name: "Halifax Mortgage",
      ownership_share: 0.5,
      suggested_currency: 1,
    },
    {
      account_id: ISA,
      account_type: 3,
      liquidity_type: 1,
      name: "Trading 212 ISA",
      ownership_share: 1,
      suggested_currency: null,
    },
    {
      account_id: HOUSE,
      account_type: 9,
      liquidity_type: 1,
      name: "Home",
      ownership_share: 0.5,
      suggested_currency: 99,
    },
    {
      account_id: JOINT,
      account_type: 1,
      liquidity_type: 1,
      name: "Joint Bills",
      ownership_share: 0.5,
      suggested_currency: 1,
    },
    {
      account_id: CURRENT,
      account_type: 1,
      liquidity_type: 1,
      name: "Amex Card",
      ownership_share: 1,
      suggested_currency: 1,
    },
  ],
  lookup_tables: {
    account_types: [
      { id: 1, name: "Current" },
      { id: 3, name: "Investment" },
      { id: 7, name: "Mortgage" },
      { id: 9, name: "Real Estate" },
    ],
    account_liquidity_types: [{ id: 1, name: "Liquid" }],
    assets: [
      { asset_id: 1, asset_type: 1, name: "Pound Sterling", ticker: "GBP" },
    ],
  },
}

const view = buildAccountsView(response)

describe("buildAccountsView", () => {
  it("sorts by class then name, liabilities last", () => {
    expect(view.accounts.map((account) => account.name)).toEqual([
      "Amex Card",
      "Joint Bills",
      "Trading 212 ISA",
      "Home",
      "Halifax Mortgage",
    ])
  })

  it("classifies each account from its type", () => {
    expect(view.byId[ISA]?.accountClass).toBe("investments")
    expect(view.byId[HOUSE]?.accountClass).toBe("property")
    expect(view.byId[MORTGAGE]).toMatchObject({
      accountClass: "liabilities",
      isLiability: true,
      isLiquid: false,
    })
    expect(view.byId[CURRENT]).toMatchObject({
      accountClass: "cash",
      isLiquid: true,
    })
  })

  it("resolves the type name from the lookup table the response carried", () => {
    expect(view.byId[MORTGAGE]?.accountTypeName).toBe("Mortgage")
    expect(view.byId[MORTGAGE]?.liquidityTypeName).toBe("Liquid")
  })

  it("leaves an unlisted type name null rather than blank, so it renders an em dash", () => {
    const orphan = buildAccountsView({
      accounts: [
        {
          account_id: CURRENT,
          account_type: 3,
          liquidity_type: 4,
          name: "Trading 212 ISA",
          ownership_share: 1,
          suggested_currency: null,
        },
      ],
      lookup_tables: {
        account_types: [],
        account_liquidity_types: [],
        assets: [],
      },
    })
    expect(orphan.byId[CURRENT]?.accountTypeName).toBeNull()
    expect(orphan.byId[CURRENT]?.liquidityTypeName).toBeNull()
    expect(orphan.byId[CURRENT]?.accountClass).toBe("investments")
  })

  it("exposes the ownership share on every row and flags joint accounts", () => {
    expect(view.byId[JOINT]).toMatchObject({
      ownershipShare: 0.5,
      ownershipSharePercent: 50,
      isJoint: true,
    })
    expect(view.byId[ISA]?.isJoint).toBe(false)
    expect(view.jointCount).toBe(3)
  })

  it("resolves the suggested currency, and leaves an unknown one null", () => {
    expect(view.byId[CURRENT]?.suggestedCurrency?.ticker).toBe("GBP")
    expect(view.byId[ISA]?.suggestedCurrency).toBeNull()
    expect(view.byId[HOUSE]?.suggestedCurrencyAssetId).toBe(99)
    expect(view.byId[HOUSE]?.suggestedCurrency).toBeNull()
  })

  it("emits every class group in render order, empty ones included", () => {
    expect(view.groups.map((group) => group.accountClass)).toEqual([
      "cash",
      "investments",
      "property",
      "other",
      "liabilities",
    ])
    expect(view.groups.at(-1)?.accounts).toHaveLength(1)
    expect(
      view.groups.find((group) => group.accountClass === "other")?.accounts
    ).toEqual([])
  })

  it("turns the account-type lookup into pickable options", () => {
    expect(view.accountTypes).toContainEqual({
      id: 7,
      name: "Mortgage",
      accountClass: "liabilities",
      isLiquid: false,
      isLiability: true,
    })
    expect(view.liquidityTypes).toEqual([{ id: 1, name: "Liquid" }])
  })

  it("handles an account with no accounts at all", () => {
    const empty = buildAccountsView({
      accounts: [],
      lookup_tables: {
        account_types: [],
        account_liquidity_types: [],
        assets: [],
      },
    })
    expect(empty.count).toBe(0)
    expect(empty.groups).toHaveLength(5)
  })
})

describe("buildAccountDetail", () => {
  const detail: GetAccountResponse = {
    name: "Halifax Mortgage",
    account_type: { id: 7, name: "Mortgage" },
    liquidity_type: { id: 1, name: "Liquid" },
    ownership_share: 0.5,
    identifiers: [{ kind: "iban", value: "GB00 0000 0000" }],
  }

  it("puts the path id back on the response, which omits it by contract", () => {
    expect(buildAccountDetail(detail, MORTGAGE)).toMatchObject({
      accountId: MORTGAGE,
      accountTypeName: "Mortgage",
      accountClass: "liabilities",
      isLiability: true,
      isJoint: true,
      ownershipSharePercent: 50,
      identifiers: [{ kind: "iban", value: "GB00 0000 0000" }],
    })
  })

  it("defaults missing identifiers to an empty list", () => {
    expect(
      buildAccountDetail({ ...detail, identifiers: undefined }, MORTGAGE)
        .identifiers
    ).toEqual([])
  })
})
