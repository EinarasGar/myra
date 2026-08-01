import { describe, expect, it } from "vitest"

import {
  collapseToTop,
  createSeriesColors,
  SERIES_COLOR_COUNT,
  SERIES_COLOR_VARS,
  SERIES_OVERFLOW_COLOR,
} from "./series-colors"

describe("series colours", () => {
  it("assigns chart-1..8 in order of first use and dedupes", () => {
    const colors = createSeriesColors(["vusa", "btc", "vusa", "gbp"])

    expect(colors.keys).toEqual(["vusa", "btc", "gbp"])
    expect(colors.colorFor("vusa")).toBe("var(--color-chart-1)")
    expect(colors.colorFor("btc")).toBe("var(--color-chart-2)")
    expect(colors.colorFor("gbp")).toBe("var(--color-chart-3)")
  })

  it("gives the same key the same colour every time the scale is rebuilt", () => {
    const keys = ["vusa", "btc", "gbp"]
    const first = createSeriesColors(keys)
    const second = createSeriesColors([...keys])

    for (const key of keys) {
      expect(second.colorFor(key)).toBe(first.colorFor(key))
    }
  })

  it("sends everything past the eighth series to the overflow colour", () => {
    const keys = Array.from({ length: 10 }, (_, index) => `asset-${index}`)
    const colors = createSeriesColors(keys)

    expect(colors.isOverflow("asset-7")).toBe(false)
    expect(colors.isOverflow("asset-8")).toBe(true)
    expect(colors.colorFor("asset-9")).toBe(SERIES_OVERFLOW_COLOR)
    expect(colors.indexFor("asset-9")).toBe(-1)
  })

  it("returns the overflow colour for an unknown key instead of throwing", () => {
    const colors = createSeriesColors(["vusa"])

    expect(colors.colorFor("never-seen")).toBe(SERIES_OVERFLOW_COLOR)
  })

  it("never uses positive or negative as a series colour", () => {
    expect(SERIES_COLOR_VARS).toHaveLength(SERIES_COLOR_COUNT)
    for (const token of SERIES_COLOR_VARS) {
      expect(token).toMatch(/^var\(--color-chart-[1-8]\)$/)
    }
    expect(SERIES_COLOR_VARS.join(" ")).not.toMatch(/positive|negative/)
    expect(SERIES_OVERFLOW_COLOR).not.toMatch(/positive|negative/)
  })

  it("collapses the tail into a single merged item beyond the limit", () => {
    const items = [
      { key: "a", weight: 5 },
      { key: "b", weight: 30 },
      { key: "c", weight: 10 },
      { key: "d", weight: 2 },
    ]

    const collapsed = collapseToTop(items, {
      weightOf: (item) => item.weight,
      limit: 3,
      merge: (tail, weight) => ({ key: `other-${tail.length}`, weight }),
    })

    expect(collapsed.map((item) => item.key)).toEqual(["b", "c", "other-2"])
    expect(collapsed.at(-1)?.weight).toBe(7)
  })

  it("leaves a list at or under the limit untouched apart from ordering", () => {
    const items = [
      { key: "a", weight: 1 },
      { key: "b", weight: 3 },
    ]

    const collapsed = collapseToTop(items, {
      weightOf: (item) => item.weight,
      limit: 8,
      merge: () => ({ key: "other", weight: 0 }),
    })

    expect(collapsed.map((item) => item.key)).toEqual(["b", "a"])
  })
})
