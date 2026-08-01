import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { PortfolioOverviewView } from "@/features/portfolio/api"

import { renderInRouter } from "../test-router"
import { InvestmentsPanelView } from "./investments-panel"

function overview(
  overrides: Partial<PortfolioOverviewView> = {}
): PortfolioOverviewView {
  return {
    scope: { kind: "portfolio" },
    assets: [],
    assetsById: {},
    positions: [],
    cash: [],
    totals: {
      marketValue: 108_400.32,
      totalCostBasis: 94_000,
      realisedGains: 155.2,
      unrealisedGains: 14_400.32,
      totalGains: 14_555.52,
      totalFees: 7,
      cashDividends: 86.4,
      returnRatio: 0.15,
    },
    assetCount: 6,
    accountCount: 3,
    largestAllocationShare: 0.367,
    appliesOwnershipShare: true,
    fifoScope: "per-account",
    isLifetimeOnly: true,
    lookups: { assetsById: {}, accountsById: {} },
    ...overrides,
  }
}

describe("InvestmentsPanelView", () => {
  it("shows two figures and a link, not a second chart", async () => {
    await renderInRouter(
      <InvestmentsPanelView overview={overview()} currency="GBP" />
    )
    const panel = document.querySelector('[data-slot="investments-panel"]')
    expect(panel?.querySelectorAll("[data-figure]")).toHaveLength(2)
    expect(panel?.querySelector("svg")).toBeNull()
    expect(screen.getByRole("link", { name: "Portfolio →" })).toBeVisible()
  })

  it("prints the market value and the unrealised gain with its sign", async () => {
    await renderInRouter(
      <InvestmentsPanelView overview={overview()} currency="GBP" />
    )
    const figures = Array.from(document.querySelectorAll("[data-figure]")).map(
      (figure) => figure.textContent
    )
    expect(figures[0]).toContain("108,400.32")
    expect(figures[1]).toContain("+")
    expect(figures[1]).toContain("14,400.32")
  })

  it("states that the value excludes cash and that the gain is lifetime", async () => {
    await renderInRouter(
      <InvestmentsPanelView overview={overview()} currency="GBP" />
    )
    const footnote = document.querySelector('[data-slot="panel-footnote"]')
    expect(footnote?.textContent).toMatch(/cash sitting in those accounts/i)
    expect(footnote?.textContent).toMatch(/lifetime, not this period/i)
  })

  it("says whose share the figures are when the server applied one", async () => {
    await renderInRouter(
      <InvestmentsPanelView overview={overview()} currency="GBP" />
    )
    expect(
      document.querySelector('[data-slot="panel-footnote"]')?.textContent
    ).toMatch(/your share of each account/i)
  })

  it("stays away entirely when nothing is invested", async () => {
    await renderInRouter(
      <InvestmentsPanelView
        overview={overview({ assetCount: 0 })}
        currency="GBP"
      />
    )
    expect(document.querySelector('[data-slot="investments-panel"]')).toBeNull()
  })
})
