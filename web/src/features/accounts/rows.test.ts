import { describe, expect, it } from "vitest"

import type {
  HoldingsView,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import { ACCOUNT_CLASS_ORDER } from "@/lib/domain/accounts"

import type {
  AccountBalance,
  AccountBalancesView,
  AccountConnectorsView,
} from "./api"
import { buildAccountIndex, unlistedAccounts } from "./rows"

function account(overrides: Partial<AccountBalance> = {}): AccountBalance {
  return {
    accountId: "a1",
    name: "Lloyds Current",
    accountTypeId: 1,
    accountTypeName: "Current",
    accountClass: "cash",
    isLiquid: true,
    isLiability: false,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    suggestedCurrencyAssetId: null,
    suggestedCurrency: null,
    value: 100,
    ratelessCount: 0,
    hasHoldings: true,
    ...overrides,
  }
}

function balances(accounts: AccountBalance[]): AccountBalancesView {
  const groups = ACCOUNT_CLASS_ORDER.map((accountClass) => {
    const members = accounts.filter((row) => row.accountClass === accountClass)
    return {
      accountClass,
      label: accountClass,
      accounts: members,
      subtotal: members.reduce((sum, row) => sum + row.value, 0),
      ratelessCount: members.reduce((sum, row) => sum + row.ratelessCount, 0),
    }
  })
  return {
    accounts,
    groups,
    total: accounts.reduce((sum, row) => sum + row.value, 0),
    netWorth: accounts.reduce((sum, row) => sum + row.value, 0),
    unmatchedValue: 0,
    unmatchedAccountIds: [],
    assetsTotal: 0,
    liabilitiesTotal: 0,
    liquidTotal: 0,
    ratelessCount: 0,
    isDegraded: false,
  }
}

const NO_CONNECTORS: AccountConnectorsView = {
  connectors: [],
  byAccountId: {},
  count: 0,
  needsAttentionCount: 0,
}

function overview(
  positions: { accountId: string; unrealisedGains: number }[]
): PortfolioOverviewView {
  return {
    positions: positions.map((position) => ({
      ...position,
      assetId: 1,
      asset: null,
      account: null,
      unitsAdded: 0,
      unitsRemaining: 0,
      marketValue: 0,
      totalCostBasis: 0,
      averageUnitCost: null,
      realisedGains: 0,
      totalGains: 0,
      totalFees: 0,
      cashDividends: 0,
      returnRatio: null,
      lots: [],
      openLotCount: 0,
      closedLotCount: 0,
      dividendLotCount: 0,
      lotsWithSalesCount: 0,
      heldSince: null,
    })),
  } as unknown as PortfolioOverviewView
}

describe("buildAccountIndex", () => {
  it("keeps liabilities last and drops the classes with nothing in them", () => {
    const view = buildAccountIndex(
      balances([
        account({ accountId: "debt", accountClass: "liabilities", value: -50 }),
        account({ accountId: "cash" }),
      ]),
      overview([]),
      NO_CONNECTORS
    )
    expect(view.groups.map((group) => group.accountClass)).toEqual([
      "cash",
      "liabilities",
    ])
  })

  it("sums unrealised gains per account and leaves an unpriced account null", () => {
    const view = buildAccountIndex(
      balances([account({ accountId: "a1" }), account({ accountId: "a2" })]),
      overview([
        { accountId: "a1", unrealisedGains: 10 },
        { accountId: "a1", unrealisedGains: 5 },
      ]),
      NO_CONNECTORS
    )
    const byId = Object.fromEntries(
      view.rows.map((row) => [row.accountId, row.unrealisedGains])
    )
    expect(byId.a1).toBe(15)
    expect(byId.a2).toBeNull()
  })

  it("distinguishes a zero gain from no priced position", () => {
    const view = buildAccountIndex(
      balances([account({ accountId: "a1" })]),
      overview([{ accountId: "a1", unrealisedGains: 0 }]),
      NO_CONNECTORS
    )
    expect(view.rows[0]?.unrealisedGains).toBe(0)
  })

  it("joins the connector on the account it is bound to", () => {
    const connectors: AccountConnectorsView = {
      connectors: [],
      byAccountId: {
        a2: {
          bindingId: "b",
          providerAccountId: "pa",
          connectionId: "c",
          accountId: "a2",
          status: "active",
          statusWord: "active",
          createdAt: 0,
          lastSyncAt: null,
          lastSyncFailed: false,
          lastSyncError: null,
          syncedThrough: null,
          writesPostDirectly: false,
        },
      },
      count: 1,
      needsAttentionCount: 0,
    }
    const view = buildAccountIndex(
      balances([account({ accountId: "a1" }), account({ accountId: "a2" })]),
      overview([]),
      connectors
    )
    expect(view.rows[0]?.connector).toBeNull()
    expect(view.rows[1]?.connector?.bindingId).toBe("b")
    expect(view.connectedCount).toBe(1)
  })

  it("counts joint accounts", () => {
    const view = buildAccountIndex(
      balances([
        account({ accountId: "a1", isJoint: true, ownershipSharePercent: 50 }),
        account({ accountId: "a2" }),
      ]),
      overview([]),
      NO_CONNECTORS
    )
    expect(view.jointCount).toBe(1)
    expect(view.count).toBe(2)
  })
})

describe("unlistedAccounts", () => {
  const holdings = {
    byAccountId: {
      gone: { value: 900, holdings: [{}, {}] },
      quiet: { value: 100, holdings: [{}] },
    },
  } as unknown as HoldingsView

  it("orders the accounts the list endpoint dropped by value", () => {
    const view = {
      ...balances([]),
      unmatchedAccountIds: ["quiet", "gone"],
    }
    expect(unlistedAccounts(view, holdings)).toEqual([
      { accountId: "gone", value: 900, holdingCount: 2 },
      { accountId: "quiet", value: 100, holdingCount: 1 },
    ])
  })

  it("is empty when every holding belongs to a listed account", () => {
    expect(unlistedAccounts(balances([]), holdings)).toEqual([])
  })
})
