import { describe, expect, it } from "vitest"

import type {
  AssetPortfolio,
  AssetPortfolioPosition,
  GetPortfolioOverview,
} from "@/api"

import { assetHoldingOf, buildPortfolioOverviewView } from "./overview"

const ISA = "aaaaaaaa-0000-0000-0000-000000000000"
const IBKR = "bbbbbbbb-0000-0000-0000-000000000000"

const openLot: AssetPortfolioPosition = {
  add_date: "2025-11-03T00:00:00Z",
  add_price: 100,
  quantity_added: 10,
  fees: 5,
  amount_sold: 4,
  sale_proceeds: 120,
  is_dividend: false,
  unit_cost_basis: 100.5,
  total_cost_basis: 1005,
  realized_gains: 118,
  unrealized_gains: 237,
  total_gains: 355,
  amount_left: 6,
}

const closedLot: AssetPortfolioPosition = {
  add_date: "2026-01-15T00:00:00Z",
  add_price: 120,
  quantity_added: 5,
  fees: 2,
  amount_sold: 5,
  sale_proceeds: 150,
  is_dividend: false,
  unit_cost_basis: 120.4,
  total_cost_basis: 602,
  realized_gains: 148,
  unrealized_gains: 0,
  total_gains: 148,
  amount_left: 0,
}

const isaPortfolio: AssetPortfolio = {
  account_id: ISA,
  asset_id: 5,
  positions: [closedLot, openLot],
  cash_dividends: 12,
  total_units: 15,
  total_fees: 7,
  realized_gains: 266,
  unrealized_gains: 237,
  total_gains: 503,
  total_cost_basis: 1607,
  unit_cost_basis: 220.9,
  remaining_units: 6,
  market_value: 840,
}

const ibkrPortfolio: AssetPortfolio = {
  account_id: IBKR,
  asset_id: 5,
  positions: [
    {
      ...openLot,
      add_date: "2025-12-01T00:00:00Z",
      quantity_added: 4,
      amount_sold: 0,
      sale_proceeds: 0,
      fees: 0,
      unit_cost_basis: 100,
      total_cost_basis: 400,
      realized_gains: 0,
      unrealized_gains: 160,
      total_gains: 160,
      amount_left: 4,
    },
  ],
  cash_dividends: 0,
  total_units: 4,
  total_fees: 0,
  realized_gains: 0,
  unrealized_gains: 160,
  total_gains: 160,
  total_cost_basis: 400,
  unit_cost_basis: 100,
  remaining_units: 4,
  market_value: 560,
}

const otherAsset: AssetPortfolio = {
  account_id: ISA,
  asset_id: 6,
  positions: [],
  cash_dividends: 0,
  total_units: 0,
  total_fees: 0,
  realized_gains: 0,
  unrealized_gains: 0,
  total_gains: 0,
  total_cost_basis: 0,
  unit_cost_basis: 0,
  remaining_units: 0,
  market_value: 600,
}

const response: GetPortfolioOverview = {
  portfolios: {
    asset_portfolios: [isaPortfolio, ibkrPortfolio, otherAsset],
    cash_portfolios: [
      { account_id: ISA, asset_id: 1, units: 250, fees: 1.5, dividends: 0.4 },
    ],
  },
  lookup_tables: {
    accounts: [
      { account_id: ISA, account_type: 3, name: "Trading 212 ISA" },
      { account_id: IBKR, account_type: 3, name: "Interactive Brokers" },
    ],
    assets: [
      { asset_id: 5, asset_type: 5, name: "Vanguard S&P 500", ticker: "VUSA" },
      { asset_id: 6, asset_type: 5, name: "iShares ACWI", ticker: "IUSQ" },
      { asset_id: 1, asset_type: 1, name: "Pound Sterling", ticker: "GBP" },
    ],
  },
}

const view = buildPortfolioOverviewView(response, { kind: "portfolio" })

describe("lots", () => {
  const position = view.positions.find(
    (candidate) => candidate.accountId === ISA && candidate.assetId === 5
  )

  it("orders lots oldest first and normalises the date to milliseconds", () => {
    expect(position?.lots.map((lot) => lot.addedAt)).toEqual([
      Date.parse("2025-11-03T00:00:00Z"),
      Date.parse("2026-01-15T00:00:00Z"),
    ])
  })

  it("identifies a closed lot by units remaining", () => {
    expect(position?.lots[0]?.isClosed).toBe(false)
    expect(position?.lots[1]?.isClosed).toBe(true)
    expect(position?.openLotCount).toBe(1)
    expect(position?.closedLotCount).toBe(1)
  })

  it("derives the per-lot return and blanks it on a closed lot", () => {
    expect(position?.lots[0]?.returnRatio).toBeCloseTo(355 / 1005, 12)
    expect(position?.lots[1]?.returnRatio).toBeNull()
  })

  it("counts the lots that carried a sale, the only sale evidence the API gives", () => {
    expect(position?.lotsWithSalesCount).toBe(2)
    expect(position?.dividendLotCount).toBe(0)
  })

  it("carries the account on every lot and never claims cross-account FIFO", () => {
    expect(position?.lots.every((lot) => lot.accountId === ISA)).toBe(true)
    expect(view.fifoScope).toBe("per-account")
  })
})

describe("positions", () => {
  const position = view.positions.find(
    (candidate) => candidate.accountId === ISA && candidate.assetId === 5
  )

  it("computes an average unit cost instead of the API's summed unit_cost_basis", () => {
    expect(position?.averageUnitCost).toBeCloseTo(1607 / 15, 12)
    expect(position?.averageUnitCost).not.toBeCloseTo(220.9, 6)
  })

  it("derives the lifetime return", () => {
    expect(position?.returnRatio).toBeCloseTo(503 / 1607, 12)
  })

  it("derives held-since from the oldest lot", () => {
    expect(position?.heldSince).toBe(Date.parse("2025-11-03T00:00:00Z"))
  })

  it("resolves the asset and account from the response's lookup tables", () => {
    expect(position?.asset?.ticker).toBe("VUSA")
    expect(position?.account?.name).toBe("Trading 212 ISA")
  })
})

describe("grouping by asset", () => {
  const vusa = view.assetsById[5]

  it("merges the per-account positions of one asset", () => {
    expect(vusa?.accountCount).toBe(2)
    expect(vusa?.marketValue).toBe(1400)
    expect(vusa?.unitsRemaining).toBe(10)
    expect(vusa?.totalCostBasis).toBe(2007)
    expect(vusa?.totalGains).toBe(663)
    expect(vusa?.cashDividends).toBe(12)
  })

  it("merges lots by date only", () => {
    expect(vusa?.lots.map((lot) => lot.accountId)).toEqual([ISA, IBKR, ISA])
  })

  it("weights the average unit cost across accounts", () => {
    expect(vusa?.averageUnitCost).toBeCloseTo(2007 / 19, 12)
  })

  it("sorts assets by market value and shares out the allocation", () => {
    expect(view.assets.map((asset) => asset.assetId)).toEqual([5, 6])
    expect(vusa?.allocationShare).toBeCloseTo(1400 / 2000, 12)
    expect(view.largestAllocationShare).toBeCloseTo(0.7, 12)
  })
})

describe("totals and scope", () => {
  it("sums the lifetime totals", () => {
    expect(view.totals).toMatchObject({
      marketValue: 2000,
      totalCostBasis: 2007,
      realisedGains: 266,
      unrealisedGains: 397,
      totalGains: 663,
      totalFees: 7,
      cashDividends: 12,
    })
    expect(view.totals.returnRatio).toBeCloseTo(663 / 2007, 12)
    expect(view.isLifetimeOnly).toBe(true)
  })

  it("counts assets and accounts including cash-only accounts", () => {
    expect(view.assetCount).toBe(2)
    expect(view.accountCount).toBe(2)
  })

  it("keeps cash positions apart from asset market value", () => {
    expect(view.cash).toHaveLength(1)
    expect(view.cash[0]?.asset?.ticker).toBe("GBP")
    expect(view.totals.marketValue).toBe(2000)
  })

  it("says whether the ownership share was applied", () => {
    expect(view.appliesOwnershipShare).toBe(true)
    expect(
      buildPortfolioOverviewView(response, { kind: "account", accountId: ISA })
        .appliesOwnershipShare
    ).toBe(false)
    expect(
      buildPortfolioOverviewView(response, { kind: "asset", assetId: 5 })
        .appliesOwnershipShare
    ).toBe(true)
  })

  it("refuses to share out an allocation in an asset-scoped view", () => {
    const scoped = buildPortfolioOverviewView(
      {
        ...response,
        portfolios: {
          asset_portfolios: [isaPortfolio, ibkrPortfolio],
          cash_portfolios: response.portfolios.cash_portfolios,
        },
      },
      { kind: "asset", assetId: 5 }
    )

    expect(assetHoldingOf(scoped)?.allocationShare).toBeNull()
    expect(scoped.largestAllocationShare).toBeNull()
    expect(scoped.totals.marketValue).toBe(1400)
  })

  it("counts only the accounts holding the asset in an asset-scoped view", () => {
    const scoped = buildPortfolioOverviewView(
      {
        ...response,
        portfolios: {
          asset_portfolios: [ibkrPortfolio],
          cash_portfolios: response.portfolios.cash_portfolios,
        },
      },
      { kind: "asset", assetId: 5 }
    )

    expect(scoped.accountCount).toBe(1)
    expect(scoped.cash).toHaveLength(1)
  })

  it("picks the scoped asset out of a per-asset overview", () => {
    const scoped = buildPortfolioOverviewView(response, {
      kind: "asset",
      assetId: 6,
    })
    expect(assetHoldingOf(scoped)?.assetId).toBe(6)
    expect(assetHoldingOf(view)).toBeNull()
  })

  it("survives an empty portfolio without dividing by zero", () => {
    const empty = buildPortfolioOverviewView(
      {
        portfolios: { asset_portfolios: [], cash_portfolios: [] },
        lookup_tables: { accounts: [], assets: [] },
      },
      { kind: "portfolio" }
    )
    expect(empty.totals.returnRatio).toBeNull()
    expect(empty.largestAllocationShare).toBeNull()
    expect(empty.assetCount).toBe(0)
  })
})

describe("wire decimals arriving as strings", () => {
  it("averages and divides them as numbers, never as NaN", () => {
    const view = buildPortfolioOverviewView(
      {
        portfolios: {
          asset_portfolios: [
            {
              ...isaPortfolio,
              total_units: "15.00",
              total_cost_basis: "1607.00",
              total_gains: "503.00",
              market_value: "840.00",
              remaining_units: "6.00",
              positions: [
                {
                  ...openLot,
                  amount_left: "6.00",
                  total_cost_basis: "1005.00",
                  total_gains: "355.00",
                },
              ],
            },
          ],
          cash_portfolios: [
            {
              account_id: ISA,
              asset_id: 1,
              units: "4200.00",
              fees: "-0",
              dividends: "0",
            },
          ],
        },
        lookup_tables: { accounts: [], assets: [] },
      } as unknown as GetPortfolioOverview,
      { kind: "portfolio" }
    )

    const position = view.positions[0]
    expect(position?.averageUnitCost).toBeCloseTo(1607 / 15, 6)
    expect(position?.returnRatio).toBeCloseTo(503 / 1607, 6)
    expect(position?.marketValue).toBe(840)
    expect(view.cash[0]?.units).toBe(4200)
  })
})
