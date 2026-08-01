import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  HoldingsView,
  PortfolioOverviewView,
} from "@/features/portfolio/api"

import type { AccountBalance, AccountBalancesView } from "./api"

const balancesView = vi.fn<() => AccountBalancesView>()
const holdingsView = vi.fn<() => HoldingsView>()

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  useRequiredBaseAssetId: () => 1,
  useHoldingsSuspense: () => holdingsView() as unknown,
  usePortfolioOverviewSuspense: () =>
    ({ positions: [] }) as unknown as PortfolioOverviewView,
  usePortfolioHistory: () => ({ data: undefined }),
}))

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  useAccounts: () => ({ data: { count: 3 } }),
  useAccountBalancesSuspense: () => balancesView() as unknown,
  useAccountConnectorsSuspense: () => ({
    connectors: [],
    byAccountId: {},
    count: 0,
    needsAttentionCount: 0,
  }),
}))

const { AccountsIndex } = await import("./accounts-index")
const { renderAccounts, stubViewport } = await import("./test-harness")

function account(overrides: Partial<AccountBalance>): AccountBalance {
  return {
    accountId: "a1",
    name: "Lloyds Current",
    accountTypeId: 1,
    accountTypeName: "Current",
    accountClass: "cash",
    isLiquid: true,
    isLiability: false,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    suggestedCurrencyAssetId: null,
    suggestedCurrency: null,
    value: 100,
    ratelessCount: 0,
    hasHoldings: true,
    ...overrides,
  }
}

function balances(
  accounts: AccountBalance[],
  overrides: Partial<AccountBalancesView> = {}
): AccountBalancesView {
  const classes = [
    "cash",
    "investments",
    "property",
    "other",
    "liabilities",
  ] as const
  return {
    accounts,
    groups: classes.map((accountClass) => {
      const members = accounts.filter(
        (row) => row.accountClass === accountClass
      )
      return {
        accountClass,
        label: `${accountClass.slice(0, 1).toUpperCase()}${accountClass.slice(1)}`,
        accounts: members,
        subtotal: members.reduce((sum, row) => sum + row.value, 0),
        ratelessCount: 0,
      }
    }),
    total: 0,
    netWorth: 0,
    unmatchedValue: 0,
    unmatchedAccountIds: [],
    assetsTotal: 0,
    liabilitiesTotal: 0,
    liquidTotal: 0,
    ratelessCount: 0,
    isDegraded: false,
    ...overrides,
  }
}

beforeEach(() => {
  stubViewport(1440)
  holdingsView.mockReturnValue({
    byAccountId: {},
  } as unknown as HoldingsView)
  balancesView.mockReturnValue(
    balances([
      account({ accountId: "a1" }),
      account({
        accountId: "a2",
        name: "Halifax Mortgage",
        accountClass: "liabilities",
        isLiability: true,
        isLiquid: false,
        accountTypeName: "Mortgage",
        value: -142880,
      }),
      account({
        accountId: "a3",
        name: "Trading 212 ISA",
        accountClass: "investments",
        isLiquid: false,
        accountTypeName: "Investment",
        value: 14234.4,
      }),
    ])
  )
})

describe("AccountsIndex", () => {
  it("groups by what the money is and puts liabilities last", async () => {
    await renderAccounts(<AccountsIndex />)
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((node) => node.textContent)
    expect(headings).toEqual(["Cash", "Investments", "Liabilities"])
  })

  it("says how many accounts there are beside the title", async () => {
    await renderAccounts(<AccountsIndex />)
    expect(screen.getByText("active", { exact: false }).textContent).toBe(
      "3 active"
    )
  })

  it("states what the totals include instead of leaving them bare", async () => {
    await renderAccounts(<AccountsIndex />)
    expect(
      screen.getByText(/Joint accounts are shown at your ownership share/)
    ).toBeInTheDocument()
  })

  it("warns before it shows an incomplete total", async () => {
    balancesView.mockReturnValue(
      balances([account({ accountId: "a1" })], {
        isDegraded: true,
        ratelessCount: 3,
      })
    )
    await renderAccounts(<AccountsIndex />)
    expect(screen.getByText(/3 holdings have no rate path/)).toBeInTheDocument()
  })

  it("offers an empty state rather than empty groups", async () => {
    balancesView.mockReturnValue(balances([]))
    await renderAccounts(<AccountsIndex />)
    expect(screen.getByText("No accounts yet")).toBeInTheDocument()
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0)
    expect(screen.queryByText("Net worth")).toBeNull()
  })

  it("folds the accounts the list endpoint cannot return", async () => {
    balancesView.mockReturnValue(
      balances([account({ accountId: "a1" })], {
        unmatchedAccountIds: ["ghost-account"],
        unmatchedValue: 1200,
      })
    )
    holdingsView.mockReturnValue({
      byAccountId: { "ghost-account": { value: 1200, holdings: [{}] } },
    } as unknown as HoldingsView)
    await renderAccounts(<AccountsIndex />)
    expect(screen.getByText("1 account not in this list")).toBeInTheDocument()
  })
})
