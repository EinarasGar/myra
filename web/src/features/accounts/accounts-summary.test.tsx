import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AccountBalancesView } from "./api"

const usePortfolioHistory = vi.fn()

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  usePortfolioHistory: () => usePortfolioHistory() as unknown,
}))

const { AccountsSummary } = await import("./accounts-summary")
const { renderAccounts } = await import("./test-harness")

const BALANCES = {
  accounts: [{ accountId: "a1" }, { accountId: "a2" }, { accountId: "a3" }],
  netWorth: 192157.48,
  total: 190157.48,
  unmatchedValue: 2000,
  unmatchedAccountIds: ["gone-1"],
  assetsTotal: 336879.85,
  liabilitiesTotal: -144722.37,
  liquidTotal: 24227.24,
} as unknown as AccountBalancesView

const RECONCILED = {
  ...BALANCES,
  total: 192157.48,
  unmatchedValue: 0,
  unmatchedAccountIds: [],
} as unknown as AccountBalancesView

function footnote(): HTMLElement | null {
  return document.querySelector('[data-slot="accounts-summary-footnote"]')
}

beforeEach(() => {
  usePortfolioHistory.mockReturnValue({ data: undefined })
})

describe("AccountsSummary", () => {
  it("shows net worth, both sides of it and what is spendable", async () => {
    await renderAccounts(
      <AccountsSummary balances={BALANCES} defaultAssetId={1} />
    )
    expect(screen.getByText("£192,157.48")).toBeInTheDocument()
    expect(screen.getByText("£336,879.85")).toBeInTheDocument()
    expect(screen.getByText("−£144,722.37")).toBeInTheDocument()
    expect(screen.getByText("£24,227.24")).toBeInTheDocument()
  })

  it("says which accounts the liquid figure counts", async () => {
    await renderAccounts(
      <AccountsSummary balances={BALANCES} defaultAssetId={1} />
    )
    expect(
      screen.getByText("current, savings and cash accounts")
    ).toBeInTheDocument()
  })

  it("keeps the totals when the history the delta needs is unavailable", async () => {
    await renderAccounts(
      <AccountsSummary balances={BALANCES} defaultAssetId={1} />
    )
    expect(screen.getByText("£192,157.48")).toBeInTheDocument()
    expect(screen.queryByText("over 30 days")).toBeNull()
  })

  it("states the window the delta covers rather than leaving it bare", async () => {
    usePortfolioHistory.mockReturnValue({ data: { change: 2418.9 } })
    await renderAccounts(
      <AccountsSummary balances={BALANCES} defaultAssetId={1} />
    )
    expect(screen.getByText(/\+£2,418\.90/)).toBeInTheDocument()
    expect(screen.getByText("over 30 days")).toBeInTheDocument()
  })

  it("separates the measure behind net worth from the one behind the other three", async () => {
    await renderAccounts(
      <AccountsSummary balances={BALANCES} defaultAssetId={1} />
    )
    const text = footnote()?.textContent ?? ""
    expect(text).toContain("Net worth counts every holding")
    expect(text).toContain("3 accounts listed below")
    expect(screen.getAllByText("listed accounts")).toHaveLength(2)
  })

  it("names the gap between net worth and the assets-plus-liabilities pair", async () => {
    await renderAccounts(
      <AccountsSummary balances={BALANCES} defaultAssetId={1} />
    )
    const text = footnote()?.textContent ?? ""
    expect(text).toContain("1 deactivated account holds")
    expect(text).toContain("£2,000.00")
    expect(text).toContain("gap between net worth and Assets plus Liabilities")
  })

  it("does not claim a gap when every holding sits on a listed account", async () => {
    await renderAccounts(
      <AccountsSummary balances={RECONCILED} defaultAssetId={1} />
    )
    const text = footnote()?.textContent ?? ""
    expect(text).toContain("Net worth counts every holding")
    expect(text).not.toContain("deactivated")
  })
})
