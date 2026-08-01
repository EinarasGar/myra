import { describe, expect, it } from "vitest"

import { mockPortfolioAttribution } from "@/lib/mock"

import { attributionMarket, WHY_IT_MOVED_MOCK_ID } from "./attribution"
import {
  GBP,
  historyFixture,
  holdingsFixture,
  overviewFixture,
} from "./fixtures"
import { buildHoldingRows } from "./holdings"
import { buildPeriodColumn, PERIOD_COLUMN_MOCK_ID } from "./period"

const holdings = holdingsFixture()
const overview = overviewFixture()
const rows = buildHoldingRows(holdings, overview)
const series = historyFixture()
const attribution = {
  attribution: mockPortfolioAttribution({ total: series.change ?? 0 }),
  mockId: WHY_IT_MOVED_MOCK_ID,
}
const market = attributionMarket(attribution)
const column = buildPeriodColumn(rows, "1m", market)

describe("buildPeriodColumn", () => {
  it("labels the column with the period the chart is showing", () => {
    expect(column.label).toBe("Last month")
    expect(buildPeriodColumn(rows, "1y", market).label).toBe("Last year")
  })

  it("declares itself invented", () => {
    expect(column.mockId).toBe(PERIOD_COLUMN_MOCK_ID)
  })

  it("gives cash no movement at all rather than a plausible one", () => {
    expect(column.byHolding[String(GBP)]).toEqual({ amount: 0, ratio: null })
  })

  it("totals to the sum of the rows it renders", () => {
    const summed = rows.reduce(
      (sum, row) => sum + (column.byHolding[row.key]?.amount ?? 0),
      0
    )
    expect(column.total).toBeCloseTo(summed)
  })

  it("splits exactly the Market bucket it was handed, never its own invention", () => {
    expect(column.total).toBe(market)
    expect(column.total).not.toBeNull()
  })

  it("moves when the window it is splitting moves", () => {
    const shorter = buildPeriodColumn(rows, "1d", 400)
    const longer = buildPeriodColumn(rows, "all", 9000)
    expect(shorter.total).toBe(400)
    expect(longer.total).toBe(9000)
    const moved = rows.filter(
      (row) => (shorter.byHolding[row.key]?.amount ?? 0) !== 0
    )
    expect(moved.length).toBeGreaterThan(0)
    for (const row of moved) {
      expect(longer.byHolding[row.key]?.amount).not.toBe(
        shorter.byHolding[row.key]?.amount
      )
    }
  })

  it("leaves a holding it cannot price out of the column instead of calling it flat", () => {
    const rateless = rows.find((row) => !row.isCash && row.value === 0)
    expect(rateless).toBeDefined()
    expect(column.byHolding[rateless?.key ?? ""]).toBeUndefined()
  })

  it("goes blank rather than inventing a figure when there is nothing to split", () => {
    const blank = buildPeriodColumn(rows, "1m", null)
    expect(blank.total).toBeNull()
    expect(blank.byHolding).toEqual({})
    expect(blank.byAccount).toEqual({})
  })

  it("apportions a holding across its accounts so the children add to the parent", () => {
    for (const row of rows) {
      const parent = column.byHolding[row.key]?.amount ?? 0
      const children = row.accounts.reduce(
        (sum, account) => sum + (column.byAccount[account.key]?.amount ?? 0),
        0
      )
      expect(children).toBeCloseTo(parent)
    }
  })

  it("is stable for the same rows, period and market figure", () => {
    expect(buildPeriodColumn(rows, "1m", market).total).toBe(column.total)
  })
})

describe("the attribution the column is split out of", () => {
  it("uses the real window change as its net, not a figure of its own", () => {
    expect(attribution.attribution.total).toBe(series.change)
  })

  it("reconciles its buckets and its subtotals to that net change", () => {
    const buckets = attribution.attribution.buckets.reduce(
      (sum, bucket) => sum + bucket.amount,
      0
    )
    const subtotals = attribution.attribution.subtotals.reduce(
      (sum, subtotal) => sum + subtotal.amount,
      0
    )
    expect(buckets).toBeCloseTo(attribution.attribution.total)
    expect(subtotals).toBeCloseTo(attribution.attribution.total)
  })

  it("prints no formula claiming to match anything outside the panel", () => {
    expect(attribution.attribution.netFormula).toBe("cash flow + assets")
    const claims = [
      attribution.attribution.netFormula,
      ...attribution.attribution.subtotals.map((subtotal) => subtotal.formula),
    ].join(" ")
    expect(claims).not.toMatch(/matches|sums to|header/i)
  })

  it("still reconciles at any window size", () => {
    for (const total of [-4820.5, 0.5, 17_400]) {
      const scaled = mockPortfolioAttribution({ total })
      expect(
        scaled.buckets.reduce((sum, bucket) => sum + bucket.amount, 0)
      ).toBeCloseTo(scaled.total)
      expect(
        scaled.subtotals.reduce((sum, subtotal) => sum + subtotal.amount, 0)
      ).toBeCloseTo(scaled.total)
    }
  })
})
