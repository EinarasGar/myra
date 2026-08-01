import { describe, expect, it } from "vitest"

import {
  legDirection,
  nativeDirection,
  nativeFigureProps,
  sumByAsset,
} from "./amounts"
import {
  at,
  ASSET_BTC,
  ASSET_GBP,
  ASSET_USD,
  ASSET_VUSA,
  lookupTables,
} from "./fixtures"
import { resolveAsset, toLookupIndex } from "./lookup"
import type { NativeAmount } from "./types"
import { assetUnitsOf, nativeAmount } from "./types"

const lookup = toLookupIndex(lookupTables)
const gbp = resolveAsset(lookup, ASSET_GBP)
const usd = resolveAsset(lookup, ASSET_USD)
const vusa = resolveAsset(lookup, ASSET_VUSA)
const btc = resolveAsset(lookup, ASSET_BTC)

describe("NativeAmount", () => {
  it("does not let asset units be read as a plain property", () => {
    const holding = nativeAmount(12, vusa)

    // @ts-expect-error asset units are unreachable by name, so they cannot be passed to a base-currency figure
    const misuse: unknown = holding.amount

    expect(misuse).toBeUndefined()
    expect(Object.keys(holding)).toEqual(["asset"])
  })

  it("cannot be forged from a plain object", () => {
    // @ts-expect-error only nativeAmount() can produce one
    const forged: NativeAmount = { amount: 12, asset: vusa }

    expect(assetUnitsOf(forged)).toBeUndefined()
  })

  it("hands the number over only when asked for asset units by name", () => {
    expect(assetUnitsOf(nativeAmount(12, vusa))).toBe(12)
    expect(assetUnitsOf(nativeAmount(-672.8, gbp))).toBe(-672.8)
  })
})

describe("nativeFigureProps", () => {
  it("renders a currency amount as money in its own currency", () => {
    expect(nativeFigureProps(nativeAmount(-672.8, gbp))).toEqual({
      value: -672.8,
      kind: "money",
      currency: "GBP",
    })
  })

  it("renders a non-currency amount as units, never as money", () => {
    expect(nativeFigureProps(nativeAmount(12, vusa))).toEqual({
      value: 12,
      kind: "units",
      ticker: "VUSA.LSE",
    })
  })
})

describe("legDirection", () => {
  it("reads the sign of a raw entry", () => {
    expect(legDirection(1)).toBe("in")
    expect(legDirection(-1)).toBe("out")
    expect(legDirection(0)).toBe("flat")
  })

  it("reads the sign of a native amount without unwrapping it", () => {
    expect(nativeDirection(nativeAmount(8, vusa))).toBe("in")
    expect(nativeDirection(nativeAmount(-8, vusa))).toBe("out")
    expect(nativeDirection(nativeAmount(0, vusa))).toBe("flat")
  })
})

describe("sumByAsset", () => {
  it("totals per asset and never across assets", () => {
    const totals = sumByAsset([
      nativeAmount(-10, gbp),
      nativeAmount(4, vusa),
      nativeAmount(-5, gbp),
    ])

    expect(
      totals.map((total) => [total.asset.ticker, assetUnitsOf(total)])
    ).toEqual([
      ["GBP", -15],
      ["VUSA.LSE", 4],
    ])
  })

  it("orders by magnitude so the largest figure leads", () => {
    const totals = sumByAsset([
      nativeAmount(2, btc),
      nativeAmount(-900, usd),
      nativeAmount(30, vusa),
    ])

    expect(totals.map((total) => total.asset.ticker)).toEqual([
      "USD",
      "VUSA.LSE",
      "BTC",
    ])
  })

  it("keeps the first observed asset reference for a total", () => {
    const totals = sumByAsset([nativeAmount(1, gbp), nativeAmount(2, gbp)])

    expect(totals).toHaveLength(1)
    expect(at(totals, 0).asset).toBe(gbp)
  })

  it("has nothing to total when given nothing", () => {
    expect(sumByAsset([])).toEqual([])
  })
})
