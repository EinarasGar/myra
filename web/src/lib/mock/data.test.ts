import { describe, expect, it } from "vitest"

import { mockAccountMetadata, MOCK_DEACTIVATED_ACCOUNTS } from "./accounts"
import {
  MOCK_NET_WORTH_ATTRIBUTION,
  mockNetWorthAttribution,
} from "./dashboard"
import {
  MOCK_LEDGER,
  mockRound,
  mockSeededRandom,
  mockSharePercent,
} from "./ledger"
import {
  MOCK_HOLDING_PERIOD_CHANGES,
  MOCK_PORTFOLIO_ATTRIBUTION,
  MOCK_PRICES_AGE_MINUTES,
  MOCK_STALE_PRICES_AGE_MINUTES,
  mockHoldingPeriodChange,
  mockLotCounts,
  mockPricesAreStale,
  mockPricesAsOf,
} from "./portfolio"
import { mockConnectionImportTotal, MOCK_MYRA_PERMISSIONS } from "./settings"

const sum = (values: number[]) => mockRound(values.reduce((a, b) => a + b, 0))

describe("the anchor ledger", () => {
  it("balances assets against liabilities", () => {
    expect(mockRound(MOCK_LEDGER.assets + MOCK_LEDGER.liabilities)).toBe(
      MOCK_LEDGER.netWorth
    )
  })

  it("rounds to cents and never produces a negative zero", () => {
    expect(mockRound(1.005)).toBe(1.01)
    expect(mockRound(-0.001)).toBe(-0)
    expect(Object.is(mockRound(0.004) + 0, 0)).toBe(true)
  })

  it("scales share bars against the largest bucket", () => {
    expect(mockSharePercent(-2980, 4180)).toBe(71.3)
    expect(mockSharePercent(4180, 4180)).toBe(100)
    expect(mockSharePercent(10, 0)).toBe(0)
  })

  it("seeds the same series for the same seed", () => {
    const first = Array.from({ length: 5 }, mockSeededRandom("x"))
    const second = Array.from({ length: 5 }, mockSeededRandom("x"))
    const other = Array.from({ length: 5 }, mockSeededRandom("y"))
    expect(first).toEqual(second)
    expect(first).not.toEqual(other)
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe("net-worth attribution (A1)", () => {
  it("prints the design's five buckets", () => {
    expect(
      MOCK_NET_WORTH_ATTRIBUTION.buckets.map((bucket) => [
        bucket.key,
        bucket.amount,
      ])
    ).toEqual([
      ["moneyIn", 4180],
      ["spending", -2980],
      ["market", 1318.9],
      ["income", 110.5],
      ["fees", -210.5],
    ])
  })

  it("has subtotals that are the arithmetic they print", () => {
    const [cashFlow, assets] = MOCK_NET_WORTH_ATTRIBUTION.subtotals
    const amount = (key: string) =>
      MOCK_NET_WORTH_ATTRIBUTION.buckets.find((bucket) => bucket.key === key)
        ?.amount ?? 0
    expect(cashFlow.amount).toBe(
      mockRound(amount("moneyIn") + amount("spending"))
    )
    expect(assets.amount).toBe(
      mockRound(amount("market") + amount("income") + amount("fees"))
    )
  })

  it.each([2418.9, 1000, 37.2, 0, -2418.9, -95.5])(
    "reconciles to the header delta %s exactly",
    (total) => {
      const attribution = mockNetWorthAttribution({ total })
      expect(attribution.total).toBe(total)
      expect(
        sum(attribution.subtotals.map((subtotal) => subtotal.amount))
      ).toBe(total)
      expect(sum(attribution.buckets.map((bucket) => bucket.amount))).toBe(
        total
      )
    }
  )

  it("draws the widest bar for the largest bucket", () => {
    const widest = Math.max(
      ...MOCK_NET_WORTH_ATTRIBUTION.buckets.map((bucket) => bucket.sharePercent)
    )
    expect(widest).toBe(100)
    for (const bucket of MOCK_NET_WORTH_ATTRIBUTION.buckets) {
      expect(bucket.sharePercent).toBeGreaterThanOrEqual(0)
      expect(bucket.sharePercent).toBeLessThanOrEqual(100)
      expect(bucket.note).not.toBe("")
    }
  })

  it("splits the same money the subtotals do", () => {
    expect(MOCK_NET_WORTH_ATTRIBUTION.split.savedAmount).toBe(
      MOCK_NET_WORTH_ATTRIBUTION.subtotals[0].amount
    )
    expect(MOCK_NET_WORTH_ATTRIBUTION.split.earnedAmount).toBe(
      MOCK_NET_WORTH_ATTRIBUTION.subtotals[1].amount
    )
  })
})

describe("portfolio period column (C1)", () => {
  it("sums to the Market bucket of the attribution panel", () => {
    const market = MOCK_NET_WORTH_ATTRIBUTION.buckets.find(
      (bucket) => bucket.key === "market"
    )
    expect(sum(MOCK_HOLDING_PERIOD_CHANGES.map((h) => h.amount))).toBe(
      market?.amount
    )
  })

  it("returns the design figure for a known ticker", () => {
    expect(mockHoldingPeriodChange({ ticker: "BTC" })).toEqual({
      ticker: "BTC",
      name: "Bitcoin",
      amount: 1462,
      percent: 5.49,
    })
  })

  it("gives cash no period movement at all", () => {
    expect(
      mockHoldingPeriodChange({
        ticker: "GBP",
        isCash: true,
        marketValue: 6424.66,
      })
    ).toEqual({ ticker: "GBP", name: "GBP", amount: 0, percent: null })
  })

  it("is deterministic and consistent for an unknown ticker", () => {
    const request = { ticker: "TSLA", marketValue: 4200 }
    const first = mockHoldingPeriodChange(request)
    expect(mockHoldingPeriodChange(request)).toEqual(first)
    expect(first.percent).not.toBeNull()
    expect(first.percent!).toBeGreaterThanOrEqual(-6)
    expect(first.percent!).toBeLessThanOrEqual(12)
    expect(Math.sign(first.amount)).toBe(Math.sign(first.percent!))
  })
})

describe("why it moved, lots and prices (C2/C4c/C5)", () => {
  it("reconciles the portfolio buckets to the portfolio delta", () => {
    expect(sum(MOCK_PORTFOLIO_ATTRIBUTION.subtotals.map((s) => s.amount))).toBe(
      MOCK_LEDGER.portfolioPeriodDelta
    )
    expect(sum(MOCK_PORTFOLIO_ATTRIBUTION.buckets.map((b) => b.amount))).toBe(
      MOCK_LEDGER.portfolioPeriodDelta
    )
  })

  it("shares the Market figure with the dashboard attribution", () => {
    const marketOf = (buckets: { key: string; amount: number }[]) =>
      buckets.find((bucket) => bucket.key === "market")?.amount
    expect(marketOf(MOCK_PORTFOLIO_ATTRIBUTION.buckets)).toBe(
      marketOf(MOCK_NET_WORTH_ATTRIBUTION.buckets)
    )
  })

  it("counts lot events only for the tickers the design shows", () => {
    expect(mockLotCounts("VWRP.LSE")).toEqual({
      saleCount: 2,
      dividendPaymentCount: 4,
      lotsChargedFees: 4,
    })
    expect(mockLotCounts("TSLA")).toBeNull()
  })

  it("prices the portfolio in the recent past and only flags stale beyond the threshold", () => {
    const now = new Date(MOCK_LEDGER.asOf)
    const fresh = mockPricesAsOf({ now })
    expect((now.getTime() - fresh.getTime()) / 60_000).toBe(
      MOCK_PRICES_AGE_MINUTES
    )
    expect(mockPricesAreStale(fresh, now)).toBe(false)
    const stale = mockPricesAsOf({
      now,
      ageMinutes: MOCK_STALE_PRICES_AGE_MINUTES,
    })
    expect(mockPricesAreStale(stale, now)).toBe(true)
  })
})

describe("account mocks (D2/D5)", () => {
  it("folds exactly the two deactivated accounts the design names", () => {
    expect(MOCK_DEACTIVATED_ACCOUNTS.map((account) => account.name)).toEqual([
      "Revolut Current",
      "Old Vanguard ISA",
    ])
    expect(MOCK_DEACTIVATED_ACCOUNTS).toHaveLength(
      MOCK_LEDGER.deactivatedAccounts
    )
  })

  it("looks metadata up by name, whatever the casing and spacing", () => {
    const mortgage = mockAccountMetadata("  HALIFAX   Mortgage ")
    expect(mortgage?.interestRatePercent).toBe(4.29)
    expect(mortgage?.originalPrincipal).toBe(210000)
    expect(mortgage?.monthlyPayment).toBe(1616.8)
    expect(mortgage?.termRemainingMonths).toBe(268)
  })

  it("returns nothing for an account it has never heard of", () => {
    expect(mockAccountMetadata("Some Real Account")).toBeNull()
  })
})

describe("settings mocks (E2/E5)", () => {
  it("seeds both Myra toggles on", () => {
    expect(MOCK_MYRA_PERMISSIONS).toEqual({
      quickUploadEnabled: true,
      useHistoryForSuggestions: true,
    })
  })

  it("knows a lifetime import count only for the design's connections", () => {
    expect(mockConnectionImportTotal("Lloyds Bank")).toBe(1284)
    expect(mockConnectionImportTotal("lloyds bank")).toBe(1284)
    expect(mockConnectionImportTotal("Revolut")).toBeNull()
  })
})
