import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  HistorySeries,
  HoldingsView,
  PortfolioOverviewView,
} from "@/features/portfolio/api"

const holdingsView = vi.fn<() => HoldingsView>()
const overviewView = vi.fn<() => PortfolioOverviewView>()
const historyView = vi.fn<(range: string) => HistorySeries>()

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  useRequiredBaseAssetId: () => 1,
  useHoldings: () => ({ data: holdingsView() }),
  useHoldingsSuspense: () => holdingsView(),
  usePortfolioOverviewSuspense: () => overviewView(),
  usePortfolioHistorySuspense: ({ range }: { range: string }) =>
    historyView(range),
}))

const {
  emptyHistoryFixture,
  emptyHoldingsFixture,
  emptyOverviewFixture,
  historyFixture,
  holdingsFixture,
  overviewFixture,
  VWRP,
} = await import("./fixtures")
const { PortfolioScreen } = await import("./portfolio-screen")
const { renderPortfolio, stubViewport, VIEWPORTS } =
  await import("./test-harness")

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  holdingsView.mockReturnValue(holdingsFixture())
  overviewView.mockReturnValue(overviewFixture())
  historyView.mockImplementation(() => historyFixture())
})

function figureText(scope: HTMLElement | null): string | undefined {
  return scope?.querySelector("[data-figure]")?.textContent ?? undefined
}

function money(text: string | null): number {
  return Number((text ?? "").replace(/[^\d.-]/g, ""))
}

function periodCellIn(rowLabel: string): string | undefined {
  const row = within(holdingsTable())
    .getByText(rowLabel)
    .closest('[data-slot="data-row"]') as HTMLElement
  return figureText(row.querySelector('[data-mock="portfolio.period-column"]'))
}

function periodColumnTotal(): string | undefined {
  return periodCellIn("Total")
}

function holdingsTable() {
  return screen.getByRole("table", { name: "Holdings" })
}

describe("PortfolioScreen", () => {
  it("draws one row per asset held, cash included, over one total", async () => {
    await renderPortfolio(<PortfolioScreen />)

    const table = holdingsTable()
    expect(within(table).getByText("BTC")).toBeInTheDocument()
    expect(within(table).getByText("VWRP.LSE")).toBeInTheDocument()
    expect(within(table).getByText("GBP")).toBeInTheDocument()
    expect(within(table).getByText("£36,189.20")).toBeInTheDocument()
  })

  it("prints an em dash where a holding has no cost basis instead of a zero", async () => {
    await renderPortfolio(<PortfolioScreen />)

    const cash = within(holdingsTable())
      .getByText("GBP")
      .closest('[data-slot="data-row"]')
    expect(cash).not.toBeNull()
    expect(
      within(cash as HTMLElement).getAllByLabelText("Not applicable").length
    ).toBeGreaterThan(0)
  })

  it("marks the period column as invented on the header, the rows and the total", async () => {
    await renderPortfolio(<PortfolioScreen />)

    const marked = holdingsTable().querySelectorAll(
      '[data-mock="portfolio.period-column"]'
    )
    expect(marked.length).toBeGreaterThan(3)
    const header = screen.getByRole("columnheader", { name: /Last month/ })
    expect(header).toHaveAttribute("data-mock", "portfolio.period-column")
    expect(header.querySelector('[data-slot="mock-badge"]')).not.toBeNull()
  })

  it("reveals per-account positions inline when a holding is expanded", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)

    const row = within(holdingsTable())
      .getByText("VWRP.LSE")
      .closest('[data-slot="data-row"]') as HTMLElement
    expect(row).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("list", { name: /by account/ })).toBeNull()

    await user.click(row)

    expect(row).toHaveAttribute("aria-expanded", "true")
    const list = screen.getByRole("list", { name: "VWRP.LSE by account" })
    expect(within(list).getByText("Trading 212 ISA")).toBeInTheDocument()
    expect(within(list).getByText("Interactive Brokers")).toBeInTheDocument()
  })

  it("links an expanded holding to its own page", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)

    await user.click(
      within(holdingsTable())
        .getByText("VWRP.LSE")
        .closest('[data-slot="data-row"]') as HTMLElement
    )

    expect(screen.getByRole("link", { name: "Open asset →" })).toHaveAttribute(
      "href",
      `/portfolio/${String(VWRP)}`
    )
  })

  it("says a cash row has no lots rather than showing an empty lot summary", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)

    await user.click(
      within(holdingsTable())
        .getByText("GBP")
        .closest('[data-slot="data-row"]') as HTMLElement
    )

    expect(screen.getByText(/No purchase lots/)).toBeInTheDocument()
  })

  it("keeps the Why it moved panel shut until it is asked for", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)

    expect(screen.queryByText("Why it moved")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Why ▾" }))

    expect(screen.getByText("Why it moved")).toBeInTheDocument()
    expect(screen.getByText("From cash flow")).toBeInTheDocument()
    expect(screen.getByText("From assets")).toBeInTheDocument()
    expect(screen.getByText("market + dividends + fees")).toBeInTheDocument()
  })

  it("splits the period column out of the Market bucket, to the penny", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)
    await user.click(screen.getByRole("button", { name: "Why ▾" }))

    const columnTotal = periodColumnTotal()
    expect(columnTotal).toBeTruthy()
    expect(figureText(document.querySelector('[data-bucket="market"]'))).toBe(
      columnTotal
    )

    const totalsRow = within(holdingsTable())
      .getByText("Total")
      .closest('[data-slot="data-row"]')
    const holdingCells = [
      ...holdingsTable().querySelectorAll('[data-slot="data-row"]'),
    ]
      .filter((row) => row !== totalsRow)
      .map((row) =>
        money(
          figureText(
            row.querySelector('[data-mock="portfolio.period-column"]')
          ) ?? null
        )
      )
    expect(holdingCells).toHaveLength(4)
    expect(holdingCells.reduce((sum, cell) => sum + cell, 0)).toBeCloseTo(
      money(columnTotal ?? null),
      2
    )
  })

  it("nets to the same figure the hero prints, not one £561 larger", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)

    const hero = figureText(
      document.querySelector('[data-slot="hero-chart-delta"]')
    )
    const scope = figureText(
      document.querySelector('[data-slot="portfolio-split-scope"]')
    )
    expect(scope).toBe("+£2,189.20")
    expect(hero).toContain("£2,189.20")

    await user.click(screen.getByRole("button", { name: "Why ▾" }))
    expect(
      figureText(document.querySelector('[data-slot="attribution-net"]'))
    ).toBe(scope)
  })

  it("prints a split whose two halves come to the window change it names", async () => {
    await renderPortfolio(<PortfolioScreen />)

    const split = document.querySelector(
      '[data-mock="portfolio.why-it-moved"]'
    ) as HTMLElement
    const halves = [...split.querySelectorAll("[data-figure]")].map((figure) =>
      money(figure.textContent)
    )
    expect(halves).toHaveLength(2)
    expect(halves.reduce((sum, half) => sum + half, 0)).toBeCloseTo(2189.2, 2)
  })

  it("claims no reconciliation it cannot keep", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)
    await user.click(screen.getByRole("button", { name: "Why ▾" }))

    const page = document.body.textContent ?? ""
    expect(page).not.toMatch(/of that|matches the header|sums to/)
    expect(page).toContain("Only its split across the four buckets is invented")
  })

  it("moves the period column when the window moves", async () => {
    const user = userEvent.setup()
    historyView.mockImplementation((range) =>
      range === "1y"
        ? { ...historyFixture(), change: 8000, changeRatio: 0.24 }
        : historyFixture()
    )
    await renderPortfolio(<PortfolioScreen />)

    const before = [periodColumnTotal(), periodCellIn("BTC")]
    await user.click(screen.getByRole("button", { name: "1Y" }))

    expect(
      screen.getByRole("columnheader", { name: /Last year/ })
    ).toBeInTheDocument()
    expect([periodColumnTotal(), periodCellIn("BTC")]).not.toContain(before[0])
    expect([periodColumnTotal(), periodCellIn("BTC")]).not.toContain(before[1])
  })

  it("leaves the column blank rather than inventing one when there is no history", async () => {
    historyView.mockImplementation(() => emptyHistoryFixture())
    await renderPortfolio(<PortfolioScreen />)

    expect(
      screen.getByText(/no valuation history for this window/)
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Why ▾" })).toBeNull()
    expect(periodColumnTotal()).not.toContain("£")
    expect(screen.getByText(/The period column is blank/)).toBeInTheDocument()
  })

  it("marks the whole Why it moved panel as invented", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)
    await user.click(screen.getByRole("button", { name: "Why ▾" }))

    expect(
      document.querySelector('[data-slot="why-it-moved"]')
    ).toHaveAttribute("data-mock", "portfolio.why-it-moved")
  })

  it("switches the composition lens and states what Currency cannot answer", async () => {
    const user = userEvent.setup()
    await renderPortfolio(<PortfolioScreen />)

    expect(screen.getByText(/largest holding is/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Currency" }))

    expect(
      screen.getByText(/never says which currency each non-cash holding/)
    ).toBeInTheDocument()
    expect(document.querySelector('[data-lens="currency"]')).not.toBeNull()
  })

  it("names the rateless holdings that shorten every total", async () => {
    await renderPortfolio(<PortfolioScreen />)

    expect(screen.getByText("Some holdings have no price")).toBeInTheDocument()
    expect(
      screen.getByText(/1 holding has no rate path to your base currency/)
    ).toBeInTheDocument()
  })

  it("does not claim the prices are fresh without saying the age is invented", async () => {
    await renderPortfolio(<PortfolioScreen />)

    const footnote = screen.getByText(/Prices as of/)
    expect(footnote).toHaveAttribute("data-mock", "portfolio.prices-as-of")
    expect(footnote.textContent).toContain("invented rather than measured")
  })

  it("offers a fold row only once the table draws fewer rows than it has", async () => {
    await renderPortfolio(<PortfolioScreen />)
    expect(screen.queryByText(/Show all/)).toBeNull()
  })

  it("distinguishes an empty portfolio from a broken one", async () => {
    holdingsView.mockReturnValue(emptyHoldingsFixture())
    overviewView.mockReturnValue(emptyOverviewFixture())
    await renderPortfolio(<PortfolioScreen />)

    expect(screen.getByText("Nothing in the portfolio yet")).toBeInTheDocument()
    expect(screen.queryByRole("table", { name: "Holdings" })).toBeNull()
  })

  it("sheds the share column before the figures at a tighter width", async () => {
    stubViewport(VIEWPORTS.tight)
    await renderPortfolio(<PortfolioScreen />)

    expect(screen.queryByRole("columnheader", { name: "Share" })).toBeNull()
    expect(
      screen.getByRole("columnheader", { name: /Last month/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Value" })
    ).toBeInTheDocument()
  })

  it("keeps the window change and its split together at every width", async () => {
    for (const width of ["phone", "stacked", "tight", "full"] as const) {
      stubViewport(VIEWPORTS[width])
      const { unmount } = await renderPortfolio(<PortfolioScreen />)

      const strip = document.querySelector(
        '[data-slot="portfolio-split"]'
      ) as HTMLElement
      expect(figureText(strip)).toBe("+£2,189.20")
      const halves = [
        ...(
          strip.querySelector(
            '[data-mock="portfolio.why-it-moved"]'
          ) as HTMLElement
        ).querySelectorAll("[data-figure]"),
      ].map((figure) => money(figure.textContent))
      expect(halves.reduce((sum, half) => sum + half, 0)).toBeCloseTo(2189.2, 2)
      unmount()
    }
  })

  it("keeps the value column at phone width and moves units into the row's own line", async () => {
    stubViewport(VIEWPORTS.phone)
    await renderPortfolio(<PortfolioScreen />)

    expect(screen.queryByRole("columnheader", { name: "Units" })).toBeNull()
    expect(
      screen.getByRole("columnheader", { name: "Value" })
    ).toBeInTheDocument()
    expect(within(holdingsTable()).getByText(/0.4200 BTC/)).toBeInTheDocument()
  })
})
