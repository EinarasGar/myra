import { describe, expect, it } from "vitest"

import { EM_DASH, MINUS, toTrueMinus } from "./chars"
import {
  appendUnitSuffix,
  applySign,
  clampFractionDigits,
  compactUnit,
  formatFixed,
  rendersSignGlyph,
  roundedDirection,
  type SignDisplay,
} from "./number"

describe("toTrueMinus", () => {
  it("replaces a hyphen-minus with the true minus", () => {
    expect(toTrueMinus("-42")).toBe(`${MINUS}42`)
    expect(toTrueMinus("-42").charCodeAt(0)).toBe(0x2212)
  })

  it("replaces the other hyphen-like dashes", () => {
    for (const dash of ["‐", "‑", "‒", "–", "⁃", "➖"]) {
      expect(toTrueMinus(`${dash}1`)).toBe(`${MINUS}1`)
    }
  })

  it("leaves the em dash alone so the not-applicable marker survives", () => {
    expect(toTrueMinus(EM_DASH)).toBe(EM_DASH)
  })

  it("leaves a string without dashes untouched", () => {
    expect(toTrueMinus("1,020.00")).toBe("1,020.00")
  })
})

describe("clampFractionDigits", () => {
  it("clamps to the Intl-supported range", () => {
    expect(clampFractionDigits(-3)).toBe(0)
    expect(clampFractionDigits(0)).toBe(0)
    expect(clampFractionDigits(4)).toBe(4)
    expect(clampFractionDigits(99)).toBe(20)
    expect(clampFractionDigits(2.7)).toBe(2)
    expect(clampFractionDigits(Number.NaN)).toBe(0)
  })
})

describe("roundedDirection", () => {
  it("reads the direction after rounding, not before", () => {
    expect(roundedDirection(-0.001, 2)).toBe(0)
    expect(roundedDirection(0.001, 2)).toBe(0)
    expect(roundedDirection(-0.005, 2)).toBe(-1)
    expect(roundedDirection(12.34, 2)).toBe(1)
    expect(roundedDirection(-12.34, 2)).toBe(-1)
  })

  it("treats negative zero as zero", () => {
    expect(roundedDirection(-0, 2)).toBe(0)
    expect(roundedDirection(0, 2)).toBe(0)
  })

  it("returns zero for non-finite values", () => {
    expect(roundedDirection(Number.NaN, 2)).toBe(0)
    expect(roundedDirection(Number.POSITIVE_INFINITY, 2)).toBe(0)
  })
})

describe("applySign", () => {
  it("prefixes the true minus for negative directions", () => {
    expect(applySign("1.00", -1)).toBe(`${MINUS}1.00`)
  })

  it("only prints a plus when the sign is always", () => {
    expect(applySign("1.00", 1)).toBe("1.00")
    expect(applySign("1.00", 1, "always")).toBe("+1.00")
    expect(applySign("0.00", 0, "always")).toBe("0.00")
  })

  it("drops the sign entirely when the sign is never", () => {
    expect(applySign("1.00", -1, "never")).toBe("1.00")
  })

  it("normalises a minus produced by the locale", () => {
    expect(applySign("-1.00", 0, "never")).toBe(`${MINUS}1.00`)
  })
})

describe("rendersSignGlyph", () => {
  const signs: SignDisplay[] = ["auto", "always", "never"]

  it.each([
    [-1, "auto", true],
    [-1, "always", true],
    [-1, "never", false],
    [0, "auto", false],
    [0, "always", false],
    [0, "never", false],
    [1, "auto", false],
    [1, "always", true],
    [1, "never", false],
  ] as const)(
    "direction %d with sign %s renders a glyph: %s",
    (direction, sign, expected) => {
      expect(rendersSignGlyph(direction, sign)).toBe(expected)
      expect(applySign("1.00", direction, sign)).toBe(
        expected ? `${direction < 0 ? MINUS : "+"}1.00` : "1.00"
      )
    }
  )

  it("knows a zero can never carry a sign", () => {
    for (const sign of signs) {
      expect(rendersSignGlyph(0, sign)).toBe(false)
    }
  })
})

describe("compactUnit", () => {
  it("picks no unit below a thousand", () => {
    expect(compactUnit(842)).toEqual({ divisor: 1, suffix: "", digits: 0 })
  })

  it("picks the unit and decimals by magnitude", () => {
    expect(compactUnit(2400)).toEqual({
      divisor: 1e3,
      suffix: "k",
      digits: 1,
    })
    expect(compactUnit(341_000)).toEqual({
      divisor: 1e3,
      suffix: "k",
      digits: 0,
    })
    expect(compactUnit(-1_234_567)).toEqual({
      divisor: 1e6,
      suffix: "m",
      digits: 1,
    })
    expect(compactUnit(2.5e9)).toEqual({
      divisor: 1e9,
      suffix: "bn",
      digits: 1,
    })
    expect(compactUnit(3.2e12)).toEqual({
      divisor: 1e12,
      suffix: "tn",
      digits: 1,
    })
  })

  it("promotes to the next unit when rounding would print four digits", () => {
    expect(compactUnit(999_950)).toEqual({
      divisor: 1e6,
      suffix: "m",
      digits: 1,
    })
  })
})

describe("appendUnitSuffix", () => {
  it("inserts the suffix after the last digit, not after the currency", () => {
    const parts: Intl.NumberFormatPart[] = [
      { type: "integer", value: "341" },
      { type: "literal", value: " " },
      { type: "currency", value: "€" },
    ]
    expect(appendUnitSuffix(parts, "k")).toBe("341k €")
  })

  it("joins untouched when there is no suffix", () => {
    const parts: Intl.NumberFormatPart[] = [
      { type: "currency", value: "£" },
      { type: "integer", value: "842" },
    ]
    expect(appendUnitSuffix(parts, "")).toBe("£842")
  })
})

describe("formatFixed", () => {
  it("locks the fraction digits in both directions", () => {
    expect(formatFixed(7, { digits: 2 })).toBe("7.00")
    expect(formatFixed(7.129, { digits: 2 })).toBe("7.13")
  })

  it("can drop grouping", () => {
    expect(formatFixed(1020, { digits: 2, grouping: false })).toBe("1020.00")
  })
})
