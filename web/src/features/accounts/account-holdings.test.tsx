import { cleanup, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SHELL_WIDTHS, type ShellWidth } from "@/components/layout/breakpoints"
import { columnTrackCount } from "@/components/primitives"
import type {
  AssetHolding,
  PortfolioOverviewView,
} from "@/features/portfolio/api"

import { AccountHoldings } from "./account-holdings"
import { HOLDINGS_COLUMNS } from "./presentation"
import { renderAccounts, stubViewport } from "./test-harness"

const VIEWPORTS: Record<ShellWidth, number> = {
  full: 1440,
  tight: 1100,
  stacked: 900,
  phone: 390,
}

function holding(overrides: Partial<AssetHolding> = {}): AssetHolding {
  return {
    assetId: 7,
    asset: {
      assetId: 7,
      ticker: "VUSA",
      name: "Vanguard S&P 500",
      assetTypeId: 3,
    },
    positions: [],
    accountCount: 1,
    unitsRemaining: 12.5,
    marketValue: 9240.5,
    totalCostBasis: 8000,
    averageUnitCost: 640,
    realisedGains: 0,
    unrealisedGains: 1240.5,
    totalGains: 1240.5,
    totalFees: 0,
    cashDividends: 0,
    returnRatio: 0.1551,
    heldSince: null,
    allocationShare: null,
    lots: [],
    fifoScope: "per-account",
    ...overrides,
  }
}

function overview(assets: AssetHolding[]): PortfolioOverviewView {
  const marketValue = assets.reduce((sum, asset) => sum + asset.marketValue, 0)
  const totalGains = assets.reduce((sum, asset) => sum + asset.totalGains, 0)
  return {
    scope: { kind: "account", accountId: "a1" },
    assets,
    assetsById: Object.fromEntries(
      assets.map((asset) => [asset.assetId, asset])
    ),
    positions: [],
    cash: [],
    totals: {
      marketValue,
      totalCostBasis: 8000,
      realisedGains: 0,
      unrealisedGains: totalGains,
      totalGains,
      totalFees: 0,
      cashDividends: 0,
      returnRatio: 0.1551,
    },
    assetCount: assets.length,
    accountCount: 1,
    largestAllocationShare: null,
    appliesOwnershipShare: false,
    fifoScope: "per-account",
    isLifetimeOnly: true,
    lookups: { assetsById: {}, accountsById: {} },
  }
}

const TWO_HOLDINGS = [
  holding(),
  holding({
    assetId: 9,
    asset: { assetId: 9, ticker: "AGGU", name: "Global Bond", assetTypeId: 3 },
    unitsRemaining: 300,
    marketValue: 3080.25,
    totalGains: -120.4,
    returnRatio: -0.0376,
  }),
]

async function renderHoldings(width: ShellWidth) {
  stubViewport(VIEWPORTS[width])
  return renderAccounts(<AccountHoldings overview={overview(TWO_HOLDINGS)} />)
}

function gridRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("tr"))
}

describe("AccountHoldings grid", () => {
  it.each(SHELL_WIDTHS)(
    "emits exactly one cell per track at the %s width",
    async (width) => {
      await renderHoldings(width)
      const tracks = columnTrackCount(HOLDINGS_COLUMNS[width])
      const rows = gridRows()
      expect(rows.length).toBe(4)
      for (const row of rows) {
        expect(row.childElementCount).toBe(tracks)
      }
    }
  )

  it("keeps every column while the shell is full", async () => {
    await renderHoldings("full")
    for (const header of [
      "Asset",
      "Units",
      "Value",
      "Share",
      "Since you bought",
    ]) {
      expect(
        screen.getByRole("columnheader", { name: header })
      ).toBeInTheDocument()
    }
  })

  it("sheds the share bar before the numbers on a tablet", async () => {
    await renderHoldings("stacked")
    expect(screen.queryByRole("columnheader", { name: "Share" })).toBeNull()
    expect(
      screen.getByRole("columnheader", { name: "Since you bought" })
    ).toBeInTheDocument()
    expect(screen.getByText("£9,240.50")).toBeInTheDocument()
    expect(screen.getByText("+£1,240.50")).toBeInTheDocument()
  })

  it("leaves only the asset and its value on a phone", async () => {
    await renderHoldings("phone")
    for (const header of ["Units", "Share", "Since you bought"]) {
      expect(screen.queryByRole("columnheader", { name: header })).toBeNull()
    }
    expect(screen.getByText("£9,240.50")).toBeInTheDocument()
  })

  it("counts units as units and value as money", async () => {
    await renderHoldings("full")
    expect(screen.getByText("12.5000")).toBeInTheDocument()
    expect(screen.getByText("£9,240.50")).toBeInTheDocument()
  })

  it("totals the account under the rows it drew", async () => {
    await renderHoldings("full")
    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByText("£12,320.75")).toBeInTheDocument()
    expect(screen.getByText("+£1,120.10")).toBeInTheDocument()
  })

  it("says nothing at all when the account holds no priced assets", async () => {
    stubViewport(VIEWPORTS.full)
    const { container } = await renderAccounts(
      <AccountHoldings overview={overview([])} />
    )
    expect(container.querySelector("table")).toBeNull()
  })

  it("draws a share bar for each holding only where there is room", async () => {
    await renderHoldings("full")
    expect(
      screen.getByLabelText(/VUSA is 75% of this account's assets/)
    ).toBeInTheDocument()
    cleanup()

    await renderHoldings("stacked")
    expect(screen.queryByLabelText(/of this account's assets/)).toBeNull()
  })
})
