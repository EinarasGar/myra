import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  HistorySeries,
  HoldingsView,
  PortfolioOverviewView,
} from "@/features/portfolio/api"

import type {
  AccountConnectorsView,
  AccountDetail as AccountDetailView,
} from "./api"

const accountView = vi.fn<() => AccountDetailView>()
const connectorsView = vi.fn<() => AccountConnectorsView>()

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  useRequiredBaseAssetId: () => 1,
  useHoldingsSuspense: () =>
    ({
      byAccountId: { a1: { value: -142880, ratelessCount: 0, holdings: [] } },
    }) as unknown as HoldingsView,
  useAccountPortfolioOverviewSuspense: () =>
    ({
      positions: [],
      assets: [],
      cash: [],
      assetCount: 0,
      totals: {
        marketValue: 0,
        totalCostBasis: 0,
        realisedGains: 0,
        unrealisedGains: 0,
        totalGains: 0,
        totalFees: 0,
        cashDividends: 0,
        returnRatio: null,
      },
    }) as unknown as PortfolioOverviewView,
  useAccountPortfolioHistorySuspense: () =>
    ({
      range: "1m",
      points: [
        { timestamp: 1_700_000_000_000, value: -144000 },
        { timestamp: 1_700_600_000_000, value: -142880 },
      ],
      first: -144000,
      last: -142880,
      min: -144000,
      max: -142880,
      change: 1120,
      changeRatio: null,
      isEmpty: false,
    }) as HistorySeries,
}))

vi.mock("@/features/transactions/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/transactions/api")>()),
  useLedger: () => ({
    rows: [],
    days: [],
    totalResults: 0,
    isEmpty: true,
    isPending: false,
    isError: false,
    error: null,
    refetch: () => {},
  }),
}))

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  useAccountSuspense: () => accountView() as unknown,
  useAccountConnectorsSuspense: () => connectorsView() as unknown,
}))

const { AccountDetail } = await import("./account-detail")
const { renderAccounts, stubViewport } = await import("./test-harness")

function account(
  overrides: Partial<AccountDetailView> = {}
): AccountDetailView {
  return {
    accountId: "a1",
    name: "Halifax Mortgage",
    accountTypeId: 7,
    accountTypeName: "Mortgage",
    accountClass: "liabilities",
    isLiquid: false,
    isLiability: true,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    identifiers: [],
    ...overrides,
  }
}

const NO_CONNECTORS: AccountConnectorsView = {
  connectors: [],
  byAccountId: {},
  count: 0,
  needsAttentionCount: 0,
}

beforeEach(() => {
  stubViewport(1440)
  accountView.mockReturnValue(account())
  connectorsView.mockReturnValue(NO_CONNECTORS)
})

describe("AccountDetail", () => {
  it("keeps the way back to the index", async () => {
    await renderAccounts(<AccountDetail accountId="a1" />)
    expect(screen.getByRole("link", { name: "← Accounts" })).toHaveAttribute(
      "href",
      "/accounts"
    )
  })

  it("states the ownership share and liquidity beside the name", async () => {
    await renderAccounts(<AccountDetail accountId="a1" />)
    expect(
      screen.getByRole("heading", { name: "Halifax Mortgage" })
    ).toBeInTheDocument()
    expect(screen.getByText("100% yours · illiquid")).toBeInTheDocument()
  })

  it("draws a liability debt-shaped and calls the figure what it is", async () => {
    const { container } = await renderAccounts(<AccountDetail accountId="a1" />)
    expect(container.querySelector('[data-slot="hero-chart"]')).toHaveAttribute(
      "data-shape",
      "liability"
    )
    expect(screen.getAllByText("Balance owed").length).toBeGreaterThan(0)
  })

  it("does not caveat a wholly owned account", async () => {
    await renderAccounts(<AccountDetail accountId="a1" />)
    expect(screen.queryByText(/whole account, not your/)).toBeNull()
  })

  it("warns that a joint account's figures are not the user's share", async () => {
    accountView.mockReturnValue(
      account({ isJoint: true, ownershipShare: 0.5, ownershipSharePercent: 50 })
    )
    await renderAccounts(<AccountDetail accountId="a1" />)
    expect(
      screen.getByText("This page shows the whole account, not your 50% share")
    ).toBeInTheDocument()
  })

  it("shows connection state only when the account is bound", async () => {
    await renderAccounts(<AccountDetail accountId="a1" />)
    expect(screen.queryByText("Needs attention")).toBeNull()

    connectorsView.mockReturnValue({
      connectors: [],
      byAccountId: {
        a1: {
          bindingId: "b",
          providerAccountId: "pa",
          connectionId: "c",
          accountId: "a1",
          status: "error",
          statusWord: "needsAttention",
          createdAt: 0,
          lastSyncAt: null,
          lastSyncFailed: true,
          lastSyncError: "consent expired",
          syncedThrough: null,
          writesPostDirectly: false,
        },
      },
      count: 1,
      needsAttentionCount: 1,
    })
    const { unmount } = await renderAccounts(<AccountDetail accountId="a1" />)
    expect(screen.getByText("Needs attention")).toBeInTheDocument()
    expect(screen.getByText("consent expired")).toBeInTheDocument()
    unmount()
  })
})
