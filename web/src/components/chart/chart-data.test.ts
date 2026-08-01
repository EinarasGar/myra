import { describe, expect, it } from "vitest"

import {
  axisTicks,
  baseValueFor,
  chartDelta,
  hasPlottableSeries,
  indexAtRatio,
  ratioAtIndex,
  resolvePoints,
  spanInDays,
  toChartPoints,
  unixSecondsToMs,
  valueOffsetRatio,
  yDomainFor,
} from "./chart-data"

const DAY = 24 * 60 * 60 * 1000
const START = new Date(2026, 6, 24).getTime()

const series = resolvePoints([
  { date: START, value: 100 },
  { date: START + DAY, value: 110 },
  { date: START + 2 * DAY, value: 120 },
])

describe("chart data", () => {
  it("reads the API's unix-second history rows as milliseconds", () => {
    expect(unixSecondsToMs(1_780_000_000)).toBe(1_780_000_000_000)
    expect(
      toChartPoints([
        { date: 1_780_000_000, rate: 12 },
        { date: 1_780_086_400, rate: null },
      ])
    ).toEqual([
      { date: 1_780_000_000_000, value: 12 },
      { date: 1_780_086_400_000, value: null },
    ])
  })

  it("sorts by time, drops unparseable dates and nulls non-finite values", () => {
    const points = resolvePoints([
      { date: START + DAY, value: 2 },
      { date: "not a date", value: 3 },
      { date: START, value: Number.NaN },
    ])

    expect(points).toEqual([
      { t: START, value: null },
      { t: START + DAY, value: 2 },
    ])
  })

  it("needs two plottable values before it will draw", () => {
    expect(hasPlottableSeries(series)).toBe(true)
    expect(hasPlottableSeries(resolvePoints([{ date: START, value: 1 }]))).toBe(
      false
    )
  })

  it("derives the delta from the first and last plottable values", () => {
    expect(chartDelta(series)).toEqual({
      from: 100,
      to: 120,
      change: 20,
      ratio: 0.2,
    })
  })

  it("derives the scrubbed delta from the first value to the scrubbed point", () => {
    expect(chartDelta(series, 1)?.change).toBe(10)
  })

  it("has no ratio when the series starts at zero", () => {
    const fromZero = resolvePoints([
      { date: START, value: 0 },
      { date: START + DAY, value: 5 },
    ])

    expect(chartDelta(fromZero)?.ratio).toBeNull()
  })

  it("pads an asset domain by ten percent on both sides", () => {
    expect(yDomainFor(series)).toEqual([98, 122])
    expect(baseValueFor(yDomainFor(series))).toBe(98)
  })

  it("tops a liability domain at zero so the line climbs toward it", () => {
    const debt = resolvePoints([
      { date: START, value: -210000 },
      { date: START + DAY, value: -144722 },
    ])

    const domain = yDomainFor(debt, "liability")
    expect(domain[1]).toBe(0)
    expect(domain[0]).toBeLessThan(-210000)
    expect(baseValueFor(domain, "liability")).toBe(0)
  })

  it("survives a flat series without collapsing the domain", () => {
    const flat = resolvePoints([
      { date: START, value: 50 },
      { date: START + DAY, value: 50 },
    ])

    const [min, max] = yDomainFor(flat)
    expect(max).toBeGreaterThan(min)
  })

  it("maps a pointer ratio to the nearest point in time", () => {
    expect(indexAtRatio(series, 0)).toBe(0)
    expect(indexAtRatio(series, 0.5)).toBe(1)
    expect(indexAtRatio(series, 1)).toBe(2)
    expect(indexAtRatio(series, 2)).toBe(2)
    expect(indexAtRatio(series, -1)).toBe(0)
    expect(indexAtRatio([], 0.5)).toBeNull()
  })

  it("round-trips index and ratio", () => {
    expect(ratioAtIndex(series, 1)).toBe(0.5)
    expect(indexAtRatio(series, ratioAtIndex(series, 2))).toBe(2)
  })

  it("measures the span in whole days", () => {
    expect(spanInDays(series)).toBe(2)
    expect(spanInDays([])).toBe(0)
  })

  it("labels the axis with one tick per requested step", () => {
    const ticks = axisTicks(series, 3)

    expect(ticks).toHaveLength(3)
    expect(ticks[0]).toContain("24")
    expect(ticks[2]).toContain("26")
  })

  it("places a value inside the domain as a top-down ratio", () => {
    expect(valueOffsetRatio(122, [98, 122])).toBe(0)
    expect(valueOffsetRatio(98, [98, 122])).toBe(1)
    expect(valueOffsetRatio(110, [98, 122])).toBeCloseTo(0.5, 5)
  })
})
