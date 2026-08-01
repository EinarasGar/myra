import { describe, expect, it } from "vitest"

import { countOf, formatCount, pluralise } from "./plural"

describe("countOf", () => {
  it("keeps the noun singular for exactly one", () => {
    expect(countOf(1, "transaction")).toBe("1 transaction")
    expect(countOf(0, "transaction")).toBe("0 transactions")
    expect(countOf(2, "transaction")).toBe("2 transactions")
  })

  it("groups thousands so a count never reads as a raw number", () => {
    expect(countOf(2542, "row")).toBe("2,542 rows")
    expect(formatCount(1000000)).toBe("1,000,000")
  })

  it("takes an irregular plural when the noun has one", () => {
    expect(countOf(1, "entry", "entries")).toBe("1 entry")
    expect(countOf(3, "entry", "entries")).toBe("3 entries")
  })
})

describe("pluralise", () => {
  it("returns the noun alone so a sentence can place the number itself", () => {
    expect(pluralise(1, "holding")).toBe("holding")
    expect(pluralise(4, "holding")).toBe("holdings")
    expect(pluralise(1, "has", "have")).toBe("has")
    expect(pluralise(4, "has", "have")).toBe("have")
  })
})
