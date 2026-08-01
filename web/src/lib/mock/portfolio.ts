import {
  MOCK_LEDGER,
  mockRound,
  mockSeededRandom,
  mockSharePercent,
} from "./ledger"

export interface MockHoldingPeriodChange {
  ticker: string
  name: string
  amount: number
  percent: number | null
}

export const MOCK_HOLDING_PERIOD_CHANGES: readonly MockHoldingPeriodChange[] = [
  { ticker: "BTC", name: "Bitcoin", amount: 1462, percent: 5.49 },
  { ticker: "IUSQ.DE", name: "iShares MSCI ACWI", amount: 248, percent: 2.07 },
  { ticker: "VUSA.LSE", name: "Vanguard S&P 500", amount: 196, percent: 1.97 },
  {
    ticker: "VWRP.LSE",
    name: "Vanguard FTSE All-World",
    amount: 188.9,
    percent: 4.18,
  },
  { ticker: "ETH", name: "Ethereum", amount: -604, percent: -7.26 },
  { ticker: "AAPL", name: "Apple Inc.", amount: -172, percent: -2.3 },
]

export interface MockPeriodChangeRequest {
  ticker: string
  marketValue?: number
  isCash?: boolean
}

export function mockHoldingPeriodChange(
  request: MockPeriodChangeRequest
): MockHoldingPeriodChange {
  const known = MOCK_HOLDING_PERIOD_CHANGES.find(
    (holding) => holding.ticker === request.ticker
  )
  if (known) return known
  if (request.isCash || !request.marketValue) {
    return {
      ticker: request.ticker,
      name: request.ticker,
      amount: 0,
      percent: null,
    }
  }
  const random = mockSeededRandom(`period-change:${request.ticker}`)
  const percent = mockRound(random() * 18 - 6)
  const opening = request.marketValue / (1 + percent / 100)
  return {
    ticker: request.ticker,
    name: request.ticker,
    amount: mockRound(request.marketValue - opening),
    percent,
  }
}

export type MockPortfolioAttributionKey =
  "contributions" | "market" | "dividends" | "fees"

export interface MockPortfolioAttributionBucket {
  key: MockPortfolioAttributionKey
  label: string
  amount: number
  sharePercent: number
  note: string
}

export interface MockPortfolioAttribution {
  rangeLabel: string
  total: number
  buckets: MockPortfolioAttributionBucket[]
  subtotals: [
    { key: "fromCashFlow"; label: string; amount: number; formula: string },
    { key: "fromAssets"; label: string; amount: number; formula: string },
  ]
  netFormula: string
  footnote: string
}

interface PortfolioBucketSeed {
  key: MockPortfolioAttributionKey
  label: string
  amount: number
  note: string
}

const PORTFOLIO_SEEDS: readonly PortfolioBucketSeed[] = [
  {
    key: "contributions",
    label: "Contributions",
    amount: 1200,
    note: "3 transfers in from your cash accounts",
  },
  {
    key: "market",
    label: "Market",
    amount: 1318.9,
    note: "price and FX moves on 6 holdings",
  },
  {
    key: "dividends",
    label: "Dividends",
    amount: 110.5,
    note: "one VWRP payment and USD cash interest",
  },
  {
    key: "fees",
    label: "Fees",
    amount: -210.5,
    note: "brokerage, FX and platform",
  },
]

export function mockPortfolioAttribution(
  options: { total?: number; rangeLabel?: string } = {}
): MockPortfolioAttribution {
  const total = mockRound(options.total ?? MOCK_LEDGER.portfolioPeriodDelta)
  const scale = Math.abs(total) / MOCK_LEDGER.portfolioPeriodDelta

  const scaled = PORTFOLIO_SEEDS.map((seed) => ({
    ...seed,
    amount:
      seed.key === "market" ? seed.amount : mockRound(seed.amount * scale),
  }))
  const nonMarket = scaled
    .filter((seed) => seed.key !== "market")
    .reduce((sum, seed) => sum + seed.amount, 0)
  const market = mockRound(total - nonMarket)
  const amounts = new Map(
    scaled.map((seed) => [
      seed.key,
      seed.key === "market" ? market : seed.amount,
    ])
  )
  const largest = Math.max(...[...amounts.values()].map(Math.abs))
  const value = (key: MockPortfolioAttributionKey) => amounts.get(key) ?? 0

  return {
    rangeLabel: options.rangeLabel ?? MOCK_LEDGER.periodRangeLabel,
    total,
    buckets: scaled.map((seed) => ({
      key: seed.key,
      label: seed.label,
      amount: value(seed.key),
      sharePercent: mockSharePercent(value(seed.key), largest),
      note: seed.note,
    })),
    subtotals: [
      {
        key: "fromCashFlow",
        label: "From cash flow",
        amount: value("contributions"),
        formula: "money you paid in",
      },
      {
        key: "fromAssets",
        label: "From assets",
        amount: mockRound(value("market") + value("dividends") + value("fees")),
        formula: "market + dividends + fees",
      },
    ],
    netFormula: "cash flow + assets",
    footnote:
      "Contributions arrived from another of your accounts, so they raise this value without changing your net worth.",
  }
}

export const MOCK_PORTFOLIO_ATTRIBUTION: MockPortfolioAttribution =
  mockPortfolioAttribution()

export interface MockLotCounts {
  saleCount: number
  dividendPaymentCount: number
  lotsChargedFees: number
}

export const MOCK_LOT_COUNTS: Record<string, MockLotCounts> = {
  "VWRP.LSE": { saleCount: 2, dividendPaymentCount: 4, lotsChargedFees: 4 },
  "VUSA.LSE": { saleCount: 0, dividendPaymentCount: 3, lotsChargedFees: 2 },
  BTC: { saleCount: 1, dividendPaymentCount: 0, lotsChargedFees: 3 },
}

export function mockLotCounts(ticker: string): MockLotCounts | null {
  return MOCK_LOT_COUNTS[ticker] ?? null
}

export const MOCK_PRICES_AGE_MINUTES = 180

export const MOCK_STALE_PRICES_AGE_MINUTES = 1440

export const MOCK_STALE_PRICE_THRESHOLD_MINUTES = 360

export function mockPricesAsOf(
  options: { now?: Date; ageMinutes?: number } = {}
): Date {
  const now = options.now ?? new Date(MOCK_LEDGER.asOf)
  const ageMinutes = options.ageMinutes ?? MOCK_PRICES_AGE_MINUTES
  return new Date(now.getTime() - ageMinutes * 60_000)
}

export function mockPricesAreStale(
  asOf: Date,
  now: Date = new Date()
): boolean {
  return (
    (now.getTime() - asOf.getTime()) / 60_000 >
    MOCK_STALE_PRICE_THRESHOLD_MINUTES
  )
}
