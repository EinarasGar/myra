import { MOCK_LEDGER, mockRound, mockSharePercent } from "./ledger"

export type MockAttributionBucketKey =
  "moneyIn" | "spending" | "market" | "income" | "fees"

export interface MockAttributionBucket {
  key: MockAttributionBucketKey
  label: string
  amount: number
  sharePercent: number
  note: string
}

export interface MockAttributionSubtotal {
  key: "fromCashFlow" | "fromAssets"
  label: string
  amount: number
  formula: string
}

export interface MockAttribution {
  rangeLabel: string
  total: number
  buckets: MockAttributionBucket[]
  subtotals: [MockAttributionSubtotal, MockAttributionSubtotal]
  netFormula: string
  footnote: string
  split: {
    savedLabel: string
    savedAmount: number
    earnedLabel: string
    earnedAmount: number
  }
}

export interface MockAttributionOptions {
  total?: number
  rangeLabel?: string
}

interface BucketSeed {
  key: MockAttributionBucketKey
  label: string
  amount: number
  note: string
}

const ATTRIBUTION_SEEDS: readonly BucketSeed[] = [
  {
    key: "moneyIn",
    label: "Money in",
    amount: 4180,
    note: "salary, a refund and one cash deposit",
  },
  {
    key: "spending",
    label: "Spending",
    amount: -2980,
    note: "128 purchases across 5 accounts",
  },
  {
    key: "market",
    label: "Market",
    amount: 1318.9,
    note: "price and FX moves on 6 holdings",
  },
  {
    key: "income",
    label: "Income",
    amount: 110.5,
    note: "dividends and USD cash interest",
  },
  {
    key: "fees",
    label: "Fees",
    amount: -210.5,
    note: "brokerage, FX and platform",
  },
]

const ATTRIBUTION_SEED_TOTAL = MOCK_LEDGER.netWorthPeriodDelta

export const MOCK_ATTRIBUTION_FOOTNOTE =
  "Transfers between your own accounts cancel out and never appear here."

export function mockNetWorthAttribution(
  options: MockAttributionOptions = {}
): MockAttribution {
  const total = mockRound(options.total ?? ATTRIBUTION_SEED_TOTAL)
  const scale = Math.abs(total) / ATTRIBUTION_SEED_TOTAL

  const scaled = ATTRIBUTION_SEEDS.map((seed) => ({
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

  const buckets = scaled.map<MockAttributionBucket>((seed) => {
    const amount = amounts.get(seed.key) ?? 0
    return {
      key: seed.key,
      label: seed.label,
      amount,
      sharePercent: mockSharePercent(amount, largest),
      note: seed.note,
    }
  })

  const value = (key: MockAttributionBucketKey) => amounts.get(key) ?? 0
  const fromCashFlow = mockRound(value("moneyIn") + value("spending"))
  const fromAssets = mockRound(
    value("market") + value("income") + value("fees")
  )

  return {
    rangeLabel: options.rangeLabel ?? MOCK_LEDGER.periodRangeLabel,
    total,
    buckets,
    subtotals: [
      {
        key: "fromCashFlow",
        label: "From cash flow",
        amount: fromCashFlow,
        formula: "money in + spending",
      },
      {
        key: "fromAssets",
        label: "From assets",
        amount: fromAssets,
        formula: "market + income + fees",
      },
    ],
    netFormula: "cash flow + assets",
    footnote: MOCK_ATTRIBUTION_FOOTNOTE,
    split: {
      savedLabel: "you saved",
      savedAmount: fromCashFlow,
      earnedLabel: "your assets earned",
      earnedAmount: fromAssets,
    },
  }
}

export const MOCK_NET_WORTH_ATTRIBUTION: MockAttribution =
  mockNetWorthAttribution()
