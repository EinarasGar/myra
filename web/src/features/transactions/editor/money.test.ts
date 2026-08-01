import { describe, expect, it } from "vitest"

import { localeDecimalSeparator, moneyText, parseMoney } from "./money"

describe("a decimal comma", () => {
  it("is a decimal point, not a hundredfold, whatever the locale", () => {
    expect(parseMoney("12,50", ".")).toBe(12.5)
    expect(parseMoney("12,50", ",")).toBe(12.5)
    expect(parseMoney("0,05", ".")).toBe(0.05)
  })

  it("stays a thousands separator where three digits follow and the locale groups that way", () => {
    expect(parseMoney("1,500", ".")).toBe(1500)
    expect(parseMoney("12,345", ".")).toBe(12345)
  })

  it("is a decimal point where three digits follow but the locale writes decimals that way", () => {
    expect(parseMoney("1,500", ",")).toBe(1.5)
    expect(parseMoney("1.500", ".")).toBe(1.5)
    expect(parseMoney("1.500", ",")).toBe(1500)
  })

  it("gives way to the last separator when both are present", () => {
    expect(parseMoney("1,234.56", ".")).toBe(1234.56)
    expect(parseMoney("1.234,56", ".")).toBe(1234.56)
    expect(parseMoney("1,234,567.89", ",")).toBe(1234567.89)
    expect(parseMoney("1.234.567,89", ".")).toBe(1234567.89)
  })
})

describe("what is not a number", () => {
  it.each([
    "abc",
    "12abc",
    "abc-12,50xyz",
    "£12",
    "12.34.5",
    "1,23,456",
    "-",
    ".",
    ",",
    "",
  ])("refuses %s", (input) => {
    expect(parseMoney(input, ".")).toBeNull()
  })
})

describe("what a person types on the way to a number", () => {
  it("reads the half-typed states as the number so far", () => {
    expect(parseMoney("42.", ".")).toBe(42)
    expect(parseMoney("42,", ".")).toBe(42)
    expect(parseMoney(".5", ".")).toBe(0.5)
    expect(parseMoney("0.0", ".")).toBe(0)
  })

  it("ignores a sign and the spaces around a grouped number", () => {
    expect(parseMoney("-12.50", ".")).toBe(12.5)
    expect(parseMoney("+12.50", ".")).toBe(12.5)
    expect(parseMoney("1 234.56", ".")).toBe(1234.56)
    expect(parseMoney("1 234,56", ".")).toBe(1234.56)
  })

  it("keeps the precision a ledger needs", () => {
    expect(parseMoney("3.78787879", ".")).toBe(3.78787879)
    expect(parseMoney("0.00000001", ".")).toBe(0.00000001)
  })
})

describe("what the field writes back", () => {
  it("round-trips a tiny holding instead of writing exponent notation", () => {
    expect(moneyText(0.0000001)).toBe("0.0000001")
    expect(parseMoney(moneyText(0.0000001), ".")).toBe(0.0000001)
    expect(moneyText(12.5)).toBe("12.5")
  })
})

describe("the reader's own locale", () => {
  it("is where the ambiguous case is settled from", () => {
    expect(localeDecimalSeparator("en-GB")).toBe(".")
    expect(localeDecimalSeparator("de-DE")).toBe(",")
    expect(localeDecimalSeparator("lt-LT")).toBe(",")
  })
})
