import { describe, expect, it } from "vitest"

import {
  currencySymbol,
  isCurrencyCode,
  normaliseCurrencyCode,
} from "./currency"

describe("isCurrencyCode", () => {
  it("accepts three-letter codes in any case", () => {
    expect(isCurrencyCode("GBP")).toBe(true)
    expect(isCurrencyCode("usd")).toBe(true)
    expect(isCurrencyCode(" EUR ")).toBe(true)
  })

  it("rejects tickers and non-strings", () => {
    expect(isCurrencyCode("AAPL")).toBe(false)
    expect(isCurrencyCode("")).toBe(false)
    expect(isCurrencyCode(null)).toBe(false)
    expect(isCurrencyCode(undefined)).toBe(false)
    expect(isCurrencyCode(840)).toBe(false)
  })
})

describe("normaliseCurrencyCode", () => {
  it("trims and upper-cases", () => {
    expect(normaliseCurrencyCode(" gbp ")).toBe("GBP")
  })
})

describe("currencySymbol", () => {
  it("resolves the narrow symbol for the major currencies", () => {
    expect(currencySymbol("GBP")).toBe("£")
    expect(currencySymbol("USD")).toBe("$")
    expect(currencySymbol("EUR")).toBe("€")
    expect(currencySymbol("JPY")).toBe("¥")
    expect(currencySymbol("gbp")).toBe("£")
  })

  it("follows the locale", () => {
    expect(currencySymbol("EUR", { locale: "de-DE" })).toBe("€")
    expect(
      currencySymbol("USD", { locale: "en-GB", currencyDisplay: "symbol" })
    ).toBe("US$")
  })

  it("falls back to the code for currencies with no symbol", () => {
    expect(currencySymbol("CHF")).toBe("CHF")
    expect(currencySymbol("XYZ")).toBe("XYZ")
  })

  it("returns a non-currency ticker unchanged", () => {
    expect(currencySymbol("AAPL")).toBe("AAPL")
    expect(currencySymbol(" VWRP ")).toBe("VWRP")
  })
})
