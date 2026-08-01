import { renderHook } from "@testing-library/react"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { chartDelta, resolvePoints } from "@/components/chart"
import type { HistorySeries } from "@/features/portfolio/api"
import { historyChartPoints } from "@/features/portfolio/api"

import { attributionRangeLabel } from "@/features/portfolio/attribution"

import { useNetWorthAttribution } from "./attribution"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 5, 26)
const MID_INDEX = 1

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-07-30T12:00:00Z") })
})

afterAll(() => {
  vi.useRealTimers()
})

function series(change: number | null): HistorySeries {
  if (change === null) {
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
  const first = 100_000
  return {
    range: "1m",
    points: [
      { timestamp: START, value: first },
      { timestamp: START + 15 * DAY, value: first + change / 4 },
      { timestamp: START + 30 * DAY, value: first + change },
    ],
    first,
    last: first + change,
    min: Math.min(first, first + change),
    max: Math.max(first, first + change),
    change,
    changeRatio: change / first,
    isEmpty: false,
  }
}

function headerDelta(input: HistorySeries, atIndex?: number): number | null {
  const delta = chartDelta(resolvePoints(historyChartPoints(input)), atIndex)
  return delta === null ? null : delta.change
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

describe("attributionRangeLabel", () => {
  it("names the window the series actually covers", () => {
    expect(attributionRangeLabel(series(2418.9), "en-GB")).toBe(
      "26 Jun – 26 Jul 2026"
    )
  })

  it("has no window to name when the series is empty", () => {
    expect(attributionRangeLabel(series(null))).toBeNull()
  })
})

describe("useNetWorthAttribution", () => {
  it("offers no breakdown when there is no delta to break down", () => {
    const { result } = renderHook(() => useNetWorthAttribution(series(null)))
    expect(result.current).toBeNull()
  })

  it.each([2418.9, -1200, 0, 87_654.32])(
    "keeps the subtotals adding up to the delta the chart computes for %s",
    (change) => {
      const input = series(change)
      const { result } = renderHook(() => useNetWorthAttribution(input))
      const attribution = result.current?.attribution
      expect(attribution).toBeDefined()
      if (!attribution) return

      const printed = headerDelta(input)
      expect(printed).not.toBeNull()

      const subtotalSum = attribution.subtotals.reduce(
        (sum, subtotal) => sum + subtotal.amount,
        0
      )
      expect(round(subtotalSum)).toBe(round(printed ?? NaN))
      expect(round(attribution.total)).toBe(round(printed ?? NaN))
    }
  )

  it("explains the whole window, which is not what the chart prints mid-scrub", () => {
    const input = series(2418.9)
    const { result } = renderHook(() => useNetWorthAttribution(input, "en-GB"))
    const attribution = result.current?.attribution
    expect(attribution).toBeDefined()
    if (!attribution) return

    const scrubbed = headerDelta(input, MID_INDEX)
    expect(scrubbed).not.toBeNull()
    expect(round(scrubbed ?? NaN)).not.toBe(round(attribution.total))
    expect(round(attribution.total)).toBe(round(headerDelta(input) ?? NaN))
    expect(attribution.rangeLabel).toBe("26 Jun – 26 Jul 2026")
  })

  it("keeps the split sentence equal to the two subtotals", () => {
    const { result } = renderHook(() => useNetWorthAttribution(series(2418.9)))
    const attribution = result.current?.attribution
    expect(attribution).toBeDefined()
    if (!attribution) return

    const [cashFlow, assets] = attribution.subtotals
    expect(attribution.split.savedAmount).toBe(cashFlow.amount)
    expect(attribution.split.earnedAmount).toBe(assets.amount)
  })

  it("marks itself as the mock it is", () => {
    const { result } = renderHook(() => useNetWorthAttribution(series(100)))
    expect(result.current?.mockId).toBe("dashboard.attribution")
  })

  it("scales the five buckets to the real window", () => {
    const { result } = renderHook(() => useNetWorthAttribution(series(2418.9)))
    const buckets = result.current?.attribution.buckets ?? []
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "moneyIn",
      "spending",
      "market",
      "income",
      "fees",
    ])
    expect(round(buckets.reduce((sum, bucket) => sum + bucket.amount, 0))).toBe(
      2418.9
    )
  })
})
