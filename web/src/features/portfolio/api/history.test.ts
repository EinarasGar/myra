import { describe, expect, it } from "vitest"

import { buildHistorySeries } from "./history"

describe("buildHistorySeries", () => {
  it("converts unix seconds to milliseconds and orders the series", () => {
    const series = buildHistorySeries(
      {
        range: "1m",
        sums: [
          { date: 1_780_000_000, rate: 191_000 },
          { date: 1_777_408_000, rate: 188_581.1 },
        ],
      },
      "1m"
    )

    expect(series.points).toEqual([
      { timestamp: 1_777_408_000_000, value: 188_581.1 },
      { timestamp: 1_780_000_000_000, value: 191_000 },
    ])
  })

  it("derives the hero delta as last minus first", () => {
    const series = buildHistorySeries(
      {
        range: "1m",
        sums: [
          { date: 1_777_408_000, rate: 188_581.1 },
          { date: 1_780_000_000, rate: 191_000 },
        ],
      },
      "1m"
    )

    expect(series.change).toBeCloseTo(2418.9, 6)
    expect(series.changeRatio).toBeCloseTo(2418.9 / 188_581.1, 12)
    expect(series.first).toBe(188_581.1)
    expect(series.last).toBe(191_000)
    expect(series.min).toBe(188_581.1)
    expect(series.max).toBe(191_000)
    expect(series.isEmpty).toBe(false)
  })

  it("returns nulls rather than zeros for an empty window", () => {
    const series = buildHistorySeries({ range: "1d", sums: [] }, "1d")
    expect(series).toMatchObject({
      points: [],
      first: null,
      last: null,
      change: null,
      changeRatio: null,
      min: null,
      max: null,
      isEmpty: true,
    })
  })

  it("refuses to divide by a zero opening value", () => {
    const series = buildHistorySeries(
      {
        range: "all",
        sums: [
          { date: 1, rate: 0 },
          { date: 2, rate: 500 },
        ],
      },
      "all"
    )
    expect(series.change).toBe(500)
    expect(series.changeRatio).toBeNull()
  })

  it("keeps a single-point series usable", () => {
    const series = buildHistorySeries(
      { range: "1d", sums: [{ date: 10, rate: 42 }] },
      "1d"
    )
    expect(series.change).toBe(0)
    expect(series.changeRatio).toBe(0)
    expect(series.isEmpty).toBe(false)
  })

  it("reports the requested range, not the echoed one", () => {
    const series = buildHistorySeries({ range: "whatever", sums: [] }, "6m")
    expect(series.range).toBe("6m")
  })
})
