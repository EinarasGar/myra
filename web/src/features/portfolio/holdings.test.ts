import { describe, expect, it } from "vitest"

import {
  BTC,
  CURRENT,
  GBP,
  holdingsFixture,
  IBKR,
  ISA,
  overviewFixture,
  UNPRICED,
  VWRP,
} from "./fixtures"
import { buildHoldingRows, lotSummaryOf, summariseHoldings } from "./holdings"

const holdings = holdingsFixture()
const overview = overviewFixture()
const rows = buildHoldingRows(holdings, overview)
const byKey = new Map(rows.map((row) => [row.assetId, row]))

describe("buildHoldingRows", () => {
  it("keeps every asset the user holds, including the ones the overview drops", () => {
    expect(rows.map((row) => row.assetId)).toEqual([BTC, GBP, VWRP, UNPRICED])
    expect(overview.assets.map((asset) => asset.assetId)).not.toContain(GBP)
  })

  it("attaches lifetime figures only where the overview has a position", () => {
    expect(byKey.get(VWRP)?.lifetime?.totalGains).toBeCloseTo(311.4)
    expect(byKey.get(GBP)?.lifetime).toBeNull()
    expect(byKey.get(UNPRICED)?.lifetime).toBeNull()
  })

  it("marks a currency asset as cash from its asset type, not its name", () => {
    expect(byKey.get(GBP)?.isCash).toBe(true)
    expect(byKey.get(BTC)?.isCash).toBe(false)
  })

  it("shares against the total that includes cash, so the column sums to one", () => {
    const total = rows.reduce((sum, row) => sum + row.share, 0)
    expect(total).toBeCloseTo(1)
    expect(byKey.get(GBP)?.share).toBeCloseTo(4200 / holdings.totalValue)
  })

  it("lists each account holding the asset, richest first", () => {
    expect(
      byKey.get(VWRP)?.accounts.map((account) => account.accountId)
    ).toEqual([IBKR, ISA])
    expect(byKey.get(VWRP)?.accounts[0]?.position?.totalGains).toBeCloseTo(
      103.2
    )
  })

  it("carries a rateless holding with a null value rather than a zero", () => {
    const unpriced = byKey.get(UNPRICED)
    expect(unpriced?.ratelessCount).toBe(1)
    expect(unpriced?.accounts[0]?.value).toBeNull()
    expect(unpriced?.accounts[0]?.accountId).toBe(CURRENT)
  })

  it("falls back to a stated placeholder when the lookup table omitted the asset", () => {
    expect(byKey.get(UNPRICED)?.label).toBe(`Asset ${String(UNPRICED)}`)
  })
})

describe("summariseHoldings", () => {
  const summary = summariseHoldings(rows, holdings, overview)

  it("totals value from holdings and gains from the overview", () => {
    expect(summary.totalValue).toBe(holdings.totalValue)
    expect(summary.totalGains).toBe(overview.totals.totalGains)
  })

  it("keeps cash out of the priced value it is not part of", () => {
    expect(summary.cashValue).toBe(4200)
    expect(summary.pricedValue).toBe(overview.totals.marketValue)
    expect(summary.totalValue).not.toBe(summary.pricedValue)
  })

  it("counts the accounts that actually hold something", () => {
    expect(summary.accountCount).toBe(3)
    expect(summary.assetCount).toBe(4)
    expect(summary.ratelessCount).toBe(1)
  })
})

describe("lotSummaryOf", () => {
  it("reports the merged lot ledger for an asset held in two accounts", () => {
    const holding = overview.assetsById[VWRP]
    expect(holding).toBeDefined()
    const summary = lotSummaryOf(holding!)
    expect(summary.lotCount).toBe(3)
    expect(summary.realisedGains).toBeCloseTo(64)
    expect(summary.totalFees).toBeCloseTo(6)
    expect(summary.averageUnitCost).toBeCloseTo((2171.4 + 2354.4) / 48)
  })
})
