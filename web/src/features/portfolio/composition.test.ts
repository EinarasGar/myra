import { describe, expect, it } from "vitest"

import {
  buildComposition,
  COMPOSITION_LENSES,
  NON_CASH_SEGMENT_KEY,
} from "./composition"
import { GBP, holdingsFixture, overviewFixture } from "./fixtures"
import { buildHoldingRows } from "./holdings"

const holdings = holdingsFixture()
const overview = overviewFixture()
const rows = buildHoldingRows(holdings, overview)

describe("buildComposition", () => {
  it.each(COMPOSITION_LENSES)(
    "never invents value under the %s lens",
    (lens) => {
      const composition = buildComposition(lens, rows, holdings, "GBP")
      const total = composition.segments.reduce(
        (sum, segment) => sum + segment.value,
        0
      )
      expect(total).toBeCloseTo(holdings.totalValue)
    }
  )

  it("keys the assets lens by asset id so the bar and the row share a hue", () => {
    const composition = buildComposition("assets", rows, holdings, "GBP")
    expect(composition.segments.map((segment) => segment.key)).toEqual(
      rows.map((row) => row.key)
    )
    expect(composition.isPartial).toBe(false)
  })

  it("names the largest holding's share on the assets lens", () => {
    expect(buildComposition("assets", rows, holdings, "GBP").note).toContain(
      "largest holding is"
    )
  })

  it("keys the accounts lens by account id", () => {
    const composition = buildComposition("accounts", rows, holdings, "GBP")
    expect(composition.segments.map((segment) => segment.key)).toEqual(
      holdings.byAccount.map((entry) => entry.accountId)
    )
  })

  it("splits cash by its own currency and refuses to guess the rest", () => {
    const composition = buildComposition("currency", rows, holdings, "GBP")
    expect(composition.segments[0]?.key).toBe(String(GBP))
    expect(composition.segments.map((segment) => segment.key)).toContain(
      NON_CASH_SEGMENT_KEY
    )
    expect(composition.isPartial).toBe(true)
  })

  it("stops being partial when everything held is cash", () => {
    const cashOnly = rows.filter((row) => row.isCash)
    const composition = buildComposition("currency", cashOnly, holdings, "GBP")
    expect(composition.isPartial).toBe(false)
    expect(composition.segments).toHaveLength(1)
  })

  it("says nothing is held rather than dividing by zero", () => {
    expect(buildComposition("assets", [], holdings, "GBP").note).toBe(
      "nothing is held yet"
    )
  })
})
