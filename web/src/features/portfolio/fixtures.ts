import type {
  AssetPortfolio,
  AssetPortfolioPosition,
  GetHoldingsResponse,
  GetPortfolioOverview,
} from "@/api"
import type {
  HistorySeries,
  HoldingsView,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import {
  buildHoldingsView,
  buildPortfolioOverviewView,
} from "@/features/portfolio/api"

export const ISA = "aaaaaaaa-0000-0000-0000-000000000000"
export const IBKR = "bbbbbbbb-0000-0000-0000-000000000000"
export const CURRENT = "cccccccc-0000-0000-0000-000000000000"

export const GBP = 1
export const VWRP = 5
export const BTC = 7
export const UNPRICED = 9

const ACCOUNTS = [
  { account_id: ISA, account_type: 4, name: "Trading 212 ISA" },
  { account_id: IBKR, account_type: 4, name: "Interactive Brokers" },
  { account_id: CURRENT, account_type: 1, name: "Lloyds Current" },
]

const ASSETS = [
  { asset_id: GBP, asset_type: 1, name: "Pound Sterling", ticker: "GBP" },
  {
    asset_id: VWRP,
    asset_type: 5,
    name: "Vanguard FTSE All-World",
    ticker: "VWRP.LSE",
  },
  { asset_id: BTC, asset_type: 7, name: "Bitcoin", ticker: "BTC" },
]

export const closedLot: AssetPortfolioPosition = {
  add_date: "2025-11-08T00:00:00Z",
  add_price: 88.2,
  quantity_added: 10,
  fees: 1,
  amount_sold: 10,
  sale_proceeds: 946,
  is_dividend: false,
  unit_cost_basis: 88.2,
  total_cost_basis: 882,
  realized_gains: 64,
  unrealized_gains: 0,
  total_gains: 64,
  amount_left: 0,
}

export const openLot: AssetPortfolioPosition = {
  add_date: "2026-01-24T00:00:00Z",
  add_price: 92.1,
  quantity_added: 14,
  fees: 1,
  amount_sold: 0,
  sale_proceeds: 0,
  is_dividend: false,
  unit_cost_basis: 92.1,
  total_cost_basis: 1289.4,
  realized_gains: 0,
  unrealized_gains: 144.2,
  total_gains: 144.2,
  amount_left: 14,
}

const ibkrLot: AssetPortfolioPosition = {
  add_date: "2026-05-19T00:00:00Z",
  add_price: 98.1,
  quantity_added: 24,
  fees: 4,
  amount_sold: 0,
  sale_proceeds: 0,
  is_dividend: false,
  unit_cost_basis: 98.1,
  total_cost_basis: 2354.4,
  realized_gains: 0,
  unrealized_gains: 103.2,
  total_gains: 103.2,
  amount_left: 24,
}

const isaVwrp: AssetPortfolio = {
  account_id: ISA,
  asset_id: VWRP,
  positions: [closedLot, openLot],
  cash_dividends: 60,
  total_units: 24,
  total_fees: 2,
  realized_gains: 64,
  unrealized_gains: 144.2,
  total_gains: 208.2,
  total_cost_basis: 2171.4,
  unit_cost_basis: 180.3,
  remaining_units: 14,
  market_value: 1433.6,
}

const ibkrVwrp: AssetPortfolio = {
  account_id: IBKR,
  asset_id: VWRP,
  positions: [ibkrLot],
  cash_dividends: 26.4,
  total_units: 24,
  total_fees: 4,
  realized_gains: 0,
  unrealized_gains: 103.2,
  total_gains: 103.2,
  total_cost_basis: 2354.4,
  unit_cost_basis: 98.1,
  remaining_units: 24,
  market_value: 2457.6,
}

const ibkrBtc: AssetPortfolio = {
  account_id: IBKR,
  asset_id: BTC,
  positions: [
    {
      ...openLot,
      add_date: "2025-06-02T00:00:00Z",
      add_price: 51000,
      quantity_added: 0.42,
      unit_cost_basis: 51000,
      total_cost_basis: 21420,
      unrealized_gains: 6678,
      total_gains: 6678,
      amount_left: 0.42,
      fees: 12,
    },
  ],
  cash_dividends: 0,
  total_units: 0.42,
  total_fees: 12,
  realized_gains: 0,
  unrealized_gains: 6678,
  total_gains: 6678,
  total_cost_basis: 21420,
  unit_cost_basis: 51000,
  remaining_units: 0.42,
  market_value: 28098,
}

export const overviewResponse: GetPortfolioOverview = {
  portfolios: {
    cash_portfolios: [
      {
        account_id: CURRENT,
        asset_id: GBP,
        units: 4200,
        fees: 0,
        dividends: 0,
      },
    ],
    asset_portfolios: [isaVwrp, ibkrVwrp, ibkrBtc],
  },
  lookup_tables: { accounts: ACCOUNTS, assets: ASSETS },
}

export const holdingsResponse: GetHoldingsResponse = {
  holdings: [
    { account_id: ISA, asset_id: VWRP, units: 14, value: 1433.6 },
    { account_id: IBKR, asset_id: VWRP, units: 24, value: 2457.6 },
    { account_id: IBKR, asset_id: BTC, units: 0.42, value: 28098 },
    { account_id: CURRENT, asset_id: GBP, units: 4200, value: 4200 },
    { account_id: CURRENT, asset_id: UNPRICED, units: 3, value: null },
  ],
  lookup_tables: { accounts: ACCOUNTS, assets: ASSETS },
}

export function holdingsFixture(): HoldingsView {
  return buildHoldingsView(holdingsResponse)
}

export const MORTGAGE = "dddddddd-0000-0000-0000-000000000000"

/** A mortgage's negative cash pulls net worth below the assets beside it. */
export function leveragedHoldingsFixture(): HoldingsView {
  return buildHoldingsView({
    ...holdingsResponse,
    holdings: [
      ...holdingsResponse.holdings,
      { account_id: MORTGAGE, asset_id: GBP, units: -30000, value: -30000 },
    ],
    lookup_tables: {
      accounts: [
        ...ACCOUNTS,
        { account_id: MORTGAGE, account_type: 1, name: "Halifax Mortgage" },
      ],
      assets: ASSETS,
    },
  })
}

export function overviewFixture(): PortfolioOverviewView {
  return buildPortfolioOverviewView(overviewResponse, { kind: "portfolio" })
}

export function assetOverviewFixture(): PortfolioOverviewView {
  return buildPortfolioOverviewView(
    {
      portfolios: {
        cash_portfolios: [],
        asset_portfolios: [isaVwrp, ibkrVwrp],
      },
      lookup_tables: { accounts: ACCOUNTS, assets: ASSETS },
    },
    { kind: "asset", assetId: VWRP }
  )
}

export function emptyHoldingsFixture(): HoldingsView {
  return buildHoldingsView({
    holdings: [],
    lookup_tables: { accounts: [], assets: [] },
  })
}

export function emptyOverviewFixture(): PortfolioOverviewView {
  return buildPortfolioOverviewView(
    {
      portfolios: { cash_portfolios: [], asset_portfolios: [] },
      lookup_tables: { accounts: [], assets: [] },
    },
    { kind: "portfolio" }
  )
}

export function emptyHistoryFixture(): HistorySeries {
  return {
    range: "1m",
    points: [],
    first: null,
    last: null,
    min: null,
    max: null,
    change: null,
    changeRatio: null,
    isEmpty: true,
  }
}

export function historyFixture(): HistorySeries {
  return {
    range: "1m",
    points: [
      { timestamp: 1_782_000_000_000, value: 34000 },
      { timestamp: 1_784_000_000_000, value: 36189.2 },
    ],
    first: 34000,
    last: 36189.2,
    min: 34000,
    max: 36189.2,
    change: 2189.2,
    changeRatio: 0.0644,
    isEmpty: false,
  }
}
