import { describe, expect, it } from "vitest"

import { EM_DASH, MINUS, NBSP } from "./chars"
import {
  MISSING_MONEY_CURRENCY,
  figureDirection,
  formatCompact,
  formatFigure,
  formatMoney,
  formatPercent,
  formatPlain,
  formatRate,
  formatUnits,
  quotedFractionDigits,
  toFigureNumber,
} from "./figures"

const GBP = { currency: "GBP" } as const

describe("toFigureNumber", () => {
  it("accepts finite numbers and numeric strings", () => {
    expect(toFigureNumber(1020.5)).toBe(1020.5)
    expect(toFigureNumber(0)).toBe(0)
    expect(toFigureNumber("1020.5")).toBe(1020.5)
    expect(toFigureNumber(" -12 ")).toBe(-12)
  })

  it("rejects everything that is not a number", () => {
    expect(toFigureNumber(null)).toBeNull()
    expect(toFigureNumber(undefined)).toBeNull()
    expect(toFigureNumber("")).toBeNull()
    expect(toFigureNumber("   ")).toBeNull()
    expect(toFigureNumber("about £5")).toBeNull()
    expect(toFigureNumber(Number.NaN)).toBeNull()
    expect(toFigureNumber(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe("formatMoney", () => {
  it("locks two decimals", () => {
    expect(formatMoney(1020, GBP)).toBe("£1,020.00")
    expect(formatMoney(7, GBP)).toBe("£7.00")
    expect(formatMoney(1020.994, GBP)).toBe("£1,020.99")
    expect(formatMoney(1020.995, GBP)).toBe("£1,021.00")
  })

  it("uses the true minus, never a hyphen", () => {
    const formatted = formatMoney(-588, GBP)
    expect(formatted).toBe(`${MINUS}£588.00`)
    expect(formatted.charCodeAt(0)).toBe(0x2212)
    expect(formatted).not.toContain("-")
  })

  it("prints an explicit plus only when asked", () => {
    expect(formatMoney(1020, { ...GBP, sign: "always" })).toBe("+£1,020.00")
    expect(formatMoney(1020, GBP)).toBe("£1,020.00")
  })

  it("never signs a zero", () => {
    expect(formatMoney(0, { ...GBP, sign: "always" })).toBe("£0.00")
    expect(formatMoney(-0, { ...GBP, sign: "always" })).toBe("£0.00")
  })

  it("never signs a value that rounds away to zero", () => {
    expect(formatMoney(-0.001, GBP)).toBe("£0.00")
    expect(formatMoney(0.004, { ...GBP, sign: "always" })).toBe("£0.00")
    expect(formatMoney(-0.005, GBP)).toBe(`${MINUS}£0.01`)
  })

  it("suppresses the sign when the column already states direction", () => {
    expect(formatMoney(-588, { ...GBP, sign: "never" })).toBe("£588.00")
  })

  it("renders an em dash for a value that is not applicable", () => {
    expect(formatMoney(null, GBP)).toBe(EM_DASH)
    expect(formatMoney(undefined, GBP)).toBe(EM_DASH)
    expect(formatMoney("", GBP)).toBe(EM_DASH)
    expect(formatMoney(Number.NaN, GBP)).toBe(EM_DASH)
    expect(formatMoney(Number.POSITIVE_INFINITY, GBP)).toBe(EM_DASH)
  })

  it("renders a real zero as a zero, never as an em dash", () => {
    expect(formatMoney(0, GBP)).toBe("£0.00")
  })

  it("handles very large and very small magnitudes without truncating", () => {
    expect(formatMoney(9_876_543_210.5, GBP)).toBe("£9,876,543,210.50")
    expect(formatMoney(1e21, GBP)).toBe("£1,000,000,000,000,000,000,000.00")
    expect(formatMoney(0.005, GBP)).toBe("£0.01")
    expect(formatMoney(1e-12, GBP)).toBe("£0.00")
  })

  it("formats every currency, not just the base one", () => {
    expect(formatMoney(1020, { currency: "USD" })).toBe("$1,020.00")
    expect(formatMoney(1020, { currency: "JPY" })).toBe("¥1,020.00")
    expect(formatMoney(1020, { currency: "gbp" })).toBe("£1,020.00")
    expect(formatMoney(1020, { currency: "CHF" })).toContain("CHF")
  })

  it("follows the locale for symbol placement and separators", () => {
    expect(formatMoney(1020, { currency: "EUR", locale: "de-DE" })).toBe(
      `1.020,00${NBSP}€`
    )
    expect(
      formatMoney(-1020, { currency: "SEK", locale: "sv-SE" })
    ).not.toContain("-")
    expect(formatMoney(-1020, { currency: "SEK", locale: "sv-SE" })).toContain(
      MINUS
    )
  })

  it("keeps the sign correct in locales with non-latin digits", () => {
    const negative = formatMoney(-1020, { currency: "EGP", locale: "ar-EG" })
    expect(negative.startsWith(MINUS)).toBe(true)
    expect(
      formatMoney(0.001, { currency: "EGP", locale: "ar-EG", sign: "always" })
    ).not.toContain("+")
  })

  it("falls back to a trailing ticker for codes Intl cannot format", () => {
    expect(formatMoney(1020, { currency: "AAPL" })).toBe(`1,020.00${NBSP}AAPL`)
    expect(formatMoney(-1020, { currency: "AAPL" })).toBe(
      `${MINUS}1,020.00${NBSP}AAPL`
    )
  })

  it("refuses to print money with no currency at all", () => {
    expect(() => formatMoney(1020, { currency: "" })).toThrow(
      MISSING_MONEY_CURRENCY
    )
    expect(() => formatMoney(1020, { currency: "   " })).toThrow(
      MISSING_MONEY_CURRENCY
    )
    expect(() => formatMoney(1020, { currency: "", compact: true })).toThrow(
      MISSING_MONEY_CURRENCY
    )
    expect(() => formatFigure(1020, { kind: "money", currency: "" })).toThrow(
      MISSING_MONEY_CURRENCY
    )
  })

  it("still renders the not-applicable dash before it can miss a currency", () => {
    expect(formatMoney(null, { currency: "" })).toBe(EM_DASH)
  })

  it("honours an explicit currency display", () => {
    expect(formatMoney(1020, { ...GBP, currencyDisplay: "code" })).toContain(
      "GBP"
    )
  })

  it("accepts a decimals override for zero-decimal presentations", () => {
    expect(formatMoney(1020.4, { ...GBP, decimals: 0 })).toBe("£1,020")
  })
})

describe("formatUnits", () => {
  it("locks four decimals", () => {
    expect(formatUnits(2)).toBe("2.0000")
    expect(formatUnits(0.5)).toBe("0.5000")
    expect(formatUnits(1.123456)).toBe("1.1235")
  })

  it("signs explicitly when asked", () => {
    expect(formatUnits(2, { sign: "always" })).toBe("+2.0000")
    expect(formatUnits(-2, { sign: "always" })).toBe(`${MINUS}2.0000`)
    expect(formatUnits(0.00004, { sign: "always" })).toBe("0.0000")
  })

  it("keeps the ticker attached to the figure", () => {
    expect(formatUnits(2, { ticker: "BTC" })).toBe(`2.0000${NBSP}BTC`)
  })

  it("accepts a decimals override", () => {
    expect(formatUnits(0.000000015, { decimals: 8 })).toBe("0.00000002")
  })

  it("renders an em dash for a value that is not applicable", () => {
    expect(formatUnits(null)).toBe(EM_DASH)
  })
})

describe("formatPercent", () => {
  it("defaults to one decimal", () => {
    expect(formatPercent(36.7)).toBe("36.7%")
    expect(formatPercent(32)).toBe("32.0%")
  })

  it("accepts ratios when told the scale", () => {
    expect(formatPercent(0.367, { scale: "ratio" })).toBe("36.7%")
    expect(formatPercent(0.1118, { scale: "ratio", decimals: 2 })).toBe(
      "11.18%"
    )
  })

  it("signs gains and losses explicitly", () => {
    expect(formatPercent(11.18, { decimals: 2, sign: "always" })).toBe(
      "+11.18%"
    )
    expect(formatPercent(-3.61, { decimals: 2 })).toBe(`${MINUS}3.61%`)
    expect(formatPercent(-0.004, { sign: "always" })).toBe("0.0%")
  })

  it("follows the locale", () => {
    expect(formatPercent(36.7, { locale: "fr-FR" })).toBe(`36,7${NBSP}%`)
  })

  it("renders an em dash for a closed lot with no percentage", () => {
    expect(formatPercent(null)).toBe(EM_DASH)
  })
})

describe("quotedFractionDigits", () => {
  it("reads the decimals from a quoted string", () => {
    expect(quotedFractionDigits("1.1204")).toBe(4)
    expect(quotedFractionDigits("1.28100000")).toBe(8)
    expect(quotedFractionDigits("1")).toBe(2)
  })

  it("reads the decimals from a number, exponent included", () => {
    expect(quotedFractionDigits(1.1204)).toBe(4)
    expect(quotedFractionDigits(1e-7)).toBe(7)
    expect(quotedFractionDigits(1.5e3)).toBe(2)
  })

  it("clamps float noise", () => {
    expect(quotedFractionDigits(0.1 + 0.2)).toBe(10)
  })
})

describe("formatRate", () => {
  it("prints a rate as quoted, without re-rounding", () => {
    expect(formatRate("1.1204")).toBe("1.1204")
    expect(formatRate(1.281)).toBe("1.281")
    expect(formatRate("1.28100000")).toBe("1.28100000")
    expect(formatRate(1)).toBe("1.00")
  })

  it("groups large rates and keeps the true minus", () => {
    expect(formatRate(66888.89)).toBe("66,888.89")
    expect(formatRate(-1.1204)).toBe(`${MINUS}1.1204`)
  })

  it("accepts a decimals override", () => {
    expect(formatRate(1.1204, { decimals: 2 })).toBe("1.12")
  })

  it("renders an em dash for a rate-less pair", () => {
    expect(formatRate(null)).toBe(EM_DASH)
  })
})

describe("formatPlain", () => {
  it("defaults to whole numbers", () => {
    expect(formatPlain(31)).toBe("31")
    expect(formatPlain(1412)).toBe("1,412")
  })

  it("accepts decimals and signs", () => {
    expect(formatPlain(-2.5, { decimals: 1 })).toBe(`${MINUS}2.5`)
  })
})

describe("formatCompact", () => {
  it("shortens axis figures", () => {
    expect(formatCompact(341_000, GBP)).toBe("£341k")
    expect(formatCompact(2400, GBP)).toBe("£2.4k")
    expect(formatCompact(1200, GBP)).toBe("£1.2k")
    expect(formatCompact(1_234_567)).toBe("1.2m")
    expect(formatCompact(2.5e9)).toBe("2.5bn")
    expect(formatCompact(3.2e12)).toBe("3.2tn")
  })

  it("keeps small magnitudes whole", () => {
    expect(formatCompact(842, GBP)).toBe("£842")
    expect(formatCompact(0, GBP)).toBe("£0")
  })

  it("promotes rather than printing four digits", () => {
    expect(formatCompact(999_950, GBP)).toBe("£1.0m")
  })

  it("signs and negates like every other figure", () => {
    expect(formatCompact(-1200, GBP)).toBe(`${MINUS}£1.2k`)
    expect(formatCompact(341_000, { ...GBP, sign: "always" })).toBe("+£341k")
    expect(formatCompact(0.4, { ...GBP, sign: "always" })).toBe("£0")
  })

  it("puts the unit suffix on the digits, not on the currency", () => {
    expect(formatCompact(341_000, { currency: "EUR", locale: "de-DE" })).toBe(
      `341k${NBSP}€`
    )
    expect(formatCompact(2400, { currency: "AAPL" })).toBe(`2.4k${NBSP}AAPL`)
  })

  it("renders an em dash for a value that is not applicable", () => {
    expect(formatCompact(null)).toBe(EM_DASH)
  })
})

describe("formatFigure", () => {
  it("dispatches on kind", () => {
    expect(formatFigure(-42.18, { kind: "money", currency: "GBP" })).toBe(
      `${MINUS}£42.18`
    )
    expect(formatFigure(2, { kind: "units", ticker: "BTC" })).toBe(
      `2.0000${NBSP}BTC`
    )
    expect(formatFigure(36.7, { kind: "percent" })).toBe("36.7%")
    expect(formatFigure("1.1204", { kind: "rate" })).toBe("1.1204")
    expect(formatFigure(31, { kind: "plain" })).toBe("31")
  })

  it("compacts money and units", () => {
    expect(
      formatFigure(341_000, { kind: "money", currency: "GBP", compact: true })
    ).toBe("£341k")
    expect(formatFigure(341_000, { kind: "plain", compact: true })).toBe("341k")
  })
})

describe("figureDirection", () => {
  it("matches what the formatter prints", () => {
    const money = { kind: "money", currency: "GBP" } as const
    expect(figureDirection(1020, money)).toBe(1)
    expect(figureDirection(-1020, money)).toBe(-1)
    expect(figureDirection(0, money)).toBe(0)
    expect(figureDirection(-0.001, money)).toBe(0)
    expect(figureDirection("2.0000", { kind: "units" })).toBe(1)
    expect(figureDirection(-0.004, { kind: "percent" })).toBe(0)
    expect(figureDirection(-0.06, { kind: "percent" })).toBe(-1)
    expect(figureDirection(-0.0004, { kind: "percent", scale: "ratio" })).toBe(
      0
    )
    expect(figureDirection(null, money)).toBe(0)
  })

  it("uses the compact rounding when the figure is compacted", () => {
    const compact = { kind: "money", currency: "GBP", compact: true } as const
    expect(figureDirection(0.4, compact)).toBe(0)
    expect(figureDirection(-341_000, compact)).toBe(-1)
  })
})
