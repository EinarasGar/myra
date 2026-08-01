import { describe, expect, it } from "vitest"

import { assetOverviewFixture, VWRP } from "./fixtures"
import { buildLotRows, buildLotTotals, monthsHeld, ratioOf } from "./lots"

const overview = assetOverviewFixture()
const holding = overview.assetsById[VWRP]

describe("buildLotRows", () => {
  it("orders every account's lots together by date, oldest first", () => {
    const rows = buildLotRows(holding!, overview)
    expect(rows.map((row) => row.accountLabel)).toEqual([
      "Trading 212 ISA",
      "Trading 212 ISA",
      "Interactive Brokers",
    ])
    const dates = rows.map((row) => row.lot.addedAt)
    expect([...dates].sort((a, b) => a - b)).toEqual(dates)
  })

  it("keeps a closed lot in the table and flags it", () => {
    const rows = buildLotRows(holding!, overview)
    expect(rows[0]?.isClosed).toBe(true)
    expect(rows[0]?.lot.unitsRemaining).toBe(0)
  })

  it("keeps a closed lot's realised gain but has no percentage for it", () => {
    const closed = buildLotRows(holding!, overview)[0]?.lot
    expect(closed?.realisedGains).toBeCloseTo(64)
    expect(closed?.returnRatio).toBeNull()
  })

  it("states the account rather than inventing one when the lookup omits it", () => {
    const rows = buildLotRows(holding!, {
      ...overview,
      lookups: { assetsById: {}, accountsById: {} },
    })
    expect(rows[0]?.accountLabel).toBe("Unknown account")
  })
})

describe("buildLotTotals", () => {
  const totals = buildLotTotals(holding!)

  it("counts open and closed lots separately", () => {
    expect(totals.lotCount).toBe(3)
    expect(totals.openCount).toBe(2)
    expect(totals.closedCount).toBe(1)
  })

  it("counts the events it can see rather than the ones the API never returns", () => {
    expect(totals.lotsWithSales).toBe(1)
    expect(totals.lotsChargedFees).toBe(3)
    expect(totals.dividendLots).toBe(0)
  })

  it("carries the holding's own figures rather than re-deriving them", () => {
    expect(totals.totalGains).toBe(holding!.totalGains)
    expect(totals.averageUnitCost).toBe(holding!.averageUnitCost)
    expect(totals.unitsRemaining).toBe(holding!.unitsRemaining)
  })
})

describe("ratioOf", () => {
  it("refuses to divide by a zero cost basis", () => {
    expect(ratioOf(100, 0)).toBeNull()
    expect(ratioOf(100, 400)).toBeCloseTo(0.25)
  })
})

describe("monthsHeld", () => {
  it("counts whole months from the oldest lot", () => {
    expect(monthsHeld(Date.parse("2025-11-08"), new Date("2026-07-31"))).toBe(8)
  })

  it("has nothing to say without a lot", () => {
    expect(monthsHeld(null, new Date())).toBeNull()
  })
})
