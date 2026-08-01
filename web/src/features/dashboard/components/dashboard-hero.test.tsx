import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { HistorySeries } from "@/features/portfolio/api"
import { mockNetWorthAttribution } from "@/lib/mock"

import { ATTRIBUTION_MOCK_ID } from "../api"
import { DashboardHero, NO_HISTORY_NOTE } from "./dashboard-hero"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 5, 26)

const SERIES: HistorySeries = {
  range: "1m",
  points: [
    { timestamp: START, value: 189_738.58 },
    { timestamp: START + 15 * DAY, value: 190_900 },
    { timestamp: START + 30 * DAY, value: 192_157.48 },
  ],
  first: 189_738.58,
  last: 192_157.48,
  min: 189_738.58,
  max: 192_157.48,
  change: 2418.9,
  changeRatio: 2418.9 / 189_738.58,
  isEmpty: false,
}

const EMPTY_SERIES: HistorySeries = {
  range: "1m",
  points: [],
  first: null,
  last: null,
  min: null,
  max: null,
  change: null,
  changeRatio: null,
  isEmpty: true,
}

const ATTRIBUTION = {
  attribution: mockNetWorthAttribution({
    total: 2418.9,
    rangeLabel: "26 Jun – 26 Jul 2026",
  }),
  mockId: ATTRIBUTION_MOCK_ID,
}

function renderHero(props: Partial<Parameters<typeof DashboardHero>[0]> = {}) {
  return render(
    <DashboardHero
      greeting="Good evening, Alex"
      series={SERIES}
      currency="GBP"
      period="1m"
      onPeriodChange={() => {}}
      attribution={ATTRIBUTION}
      {...props}
    />
  )
}

function panel(): HTMLElement | null {
  return document.querySelector('[data-slot="attribution-panel"]')
}

describe("DashboardHero", () => {
  it("leads with the net worth, the signed change and the greeting", () => {
    renderHero()
    expect(screen.getByText("Good evening, Alex")).toBeVisible()
    expect(
      document.querySelector('[data-slot="hero-chart-value"]')?.textContent
    ).toContain("192,157.48")
    expect(
      document.querySelector('[data-slot="hero-chart-delta"]')?.textContent
    ).toContain("2,418.90")
  })

  it("splits the change into what was saved and what was earned", () => {
    renderHero()
    const split = document.querySelector('[data-slot="hero-split"]')
    expect(split?.textContent).toContain("you saved")
    expect(split?.textContent).toContain("your assets earned")
  })

  it("names the window the split covers and the total it adds up to", () => {
    renderHero()
    const scope = document.querySelector('[data-slot="hero-split-scope"]')
    expect(scope?.textContent).toContain("26 Jun – 26 Jul 2026")
    expect(scope?.textContent).toContain("2,418.90")
  })

  it("keeps the split scoped to the whole window while the header follows the scrub", async () => {
    renderHero()
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Home" })

    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="hero-chart-delta"]')?.textContent
      ).not.toContain("2,418.90")
    )

    const scope = document.querySelector('[data-slot="hero-split-scope"]')
    expect(scope?.textContent).toContain("26 Jun – 26 Jul 2026")
    expect(scope?.textContent).toContain("2,418.90")
  })

  it("keeps the five-bucket breakdown collapsed until it is asked for", async () => {
    renderHero()
    expect(panel()).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: /why/i }))
    expect(panel()).not.toBeNull()
    expect(
      document.querySelectorAll('[data-slot="attribution-bucket"]')
    ).toHaveLength(5)
  })

  it("marks the split and the breakdown as invented, visibly, and leaves the real delta unmarked", async () => {
    renderHero()
    const split = document.querySelector('[data-slot="hero-split"]')
    expect(
      split?.querySelector(`[data-mock="${ATTRIBUTION_MOCK_ID}"]`)
    ).not.toBeNull()
    expect(split?.querySelector('[data-slot="mock-badge"]')).not.toBeNull()
    expect(
      document.querySelector('[data-slot="hero-split-scope"]')
    ).not.toHaveAttribute("data-mock")
    expect(
      document
        .querySelector('[data-slot="hero-split-scope"]')
        ?.closest("[data-mock]")
    ).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: /why/i }))
    expect(panel()).toHaveAttribute("data-mock", ATTRIBUTION_MOCK_ID)
  })

  it("shows subtotals that agree with the header delta", async () => {
    renderHero()
    await userEvent.click(screen.getByRole("button", { name: /why/i }))
    const subtotals = document.querySelectorAll(
      '[data-slot="attribution-subtotal"]'
    )
    expect(subtotals).toHaveLength(2)
    expect(
      document.querySelector('[data-slot="attribution-net"]')?.textContent
    ).toContain("2,418.90")
  })

  it("says there is not enough history rather than inventing a split", () => {
    renderHero({ series: EMPTY_SERIES, attribution: null })
    expect(screen.getByText(NO_HISTORY_NOTE)).toBeVisible()
    expect(document.querySelector('[data-slot="hero-split"]')).toBeNull()
    expect(screen.queryByRole("button", { name: /why/i })).toBeNull()
  })

  it("keeps the period selector reachable when there is nothing to plot", async () => {
    const onPeriodChange = vi.fn()
    renderHero({
      series: EMPTY_SERIES,
      attribution: null,
      onPeriodChange,
    })
    const selector = screen.getByRole("group", { name: /chart period/i })
    expect(selector).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "1Y" }))
    expect(onPeriodChange).toHaveBeenCalledWith("1y")
  })
})
