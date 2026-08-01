import { describe, expect, it } from "vitest"

import {
  daysSinceValuation,
  impliedChangeLine,
  isStaleValuation,
  lastValuedLine,
  staleValuationBody,
  staleValuationHeadline,
  VALUATION_STALE_DAYS,
  valuationAgeLabel,
} from "./valuation"

const NOW = new Date(2026, 6, 31, 10, 0, 0)

describe("daysSinceValuation", () => {
  it("counts whole days, not elapsed hours", () => {
    expect(daysSinceValuation(new Date(2026, 6, 31, 23, 30), NOW)).toBe(0)
    expect(daysSinceValuation(new Date(2026, 6, 30, 1, 0), NOW)).toBe(1)
  })

  it("never reports a future valuation as negative age", () => {
    expect(daysSinceValuation(new Date(2026, 7, 20), NOW)).toBe(0)
  })
})

describe("valuationAgeLabel", () => {
  it("names the recent past in words a person uses", () => {
    expect(valuationAgeLabel(0)).toBe("today")
    expect(valuationAgeLabel(1)).toBe("yesterday")
    expect(valuationAgeLabel(17)).toBe("17 days ago")
  })

  it("switches to months once a day count stops being readable", () => {
    expect(valuationAgeLabel(200)).toBe("7 months ago")
    expect(valuationAgeLabel(900)).toBe("2 years ago")
  })
})

describe("isStaleValuation", () => {
  it("treats the threshold itself as stale", () => {
    expect(isStaleValuation(VALUATION_STALE_DAYS - 1)).toBe(false)
    expect(isStaleValuation(VALUATION_STALE_DAYS)).toBe(true)
  })
})

describe("lastValuedLine", () => {
  it("prints the date and how old it is, never one without the other", () => {
    expect(lastValuedLine(new Date(2026, 0, 12), NOW)).toBe(
      "Last valued 12 Jan 2026 · 7 months ago"
    )
  })
})

describe("stale copy", () => {
  it("says how old the figure is and what still depends on it", () => {
    const asOf = new Date(2026, 0, 12)
    expect(staleValuationHeadline(asOf, NOW)).toBe(
      "This valuation was entered 7 months ago"
    )
    const body = staleValuationBody("FLAT.LON", asOf, NOW)
    expect(body).toContain("FLAT.LON")
    expect(body).toContain("net worth")
    expect(body).toContain("12 Jan 2026")
  })
})

describe("impliedChangeLine", () => {
  it("is silent when there is nothing to compare against", () => {
    expect(impliedChangeLine(9450, null)).toBeNull()
    expect(impliedChangeLine(9450, 0)).toBeNull()
  })

  it("states the direction and size against the last valuation", () => {
    expect(impliedChangeLine(341000, 328000)).toBe(
      "That is up 4.0% on the last valuation."
    )
    expect(impliedChangeLine(295200, 328000)).toBe(
      "That is down 10.0% on the last valuation."
    )
  })

  it("does not invent a direction for an unchanged rate", () => {
    expect(impliedChangeLine(328000, 328000)).toBe(
      "No change on the last valuation."
    )
  })
})
