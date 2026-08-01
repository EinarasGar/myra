import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AccountBalancesView } from "@/features/accounts/api"
import { buildAccountConnectors } from "@/features/accounts/api"
import type {
  HistorySeries,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import type { LedgerResult } from "@/features/transactions/api"
import { EMPTY_LOOKUP, planLedgerQuery } from "@/features/transactions/api"
import { queryKeys } from "@/lib/query"
import type { IdentifiableQuickUploadResponse } from "@/api"

import { renderInRouter, stubViewport } from "./test-router"

const USER_ID = "00000000-0000-0000-0000-000000000000"

function quickUpload(id: string): IdentifiableQuickUploadResponse {
  return {
    id,
    created_at: "2026-07-26T06:12:00.000Z",
    updated_at: "2026-07-26T06:12:00.000Z",
    source_file_id: `file-${id}`,
    status: "proposal_ready",
    proposal_type: "receipt",
  }
}
const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 5, 26)

const SERIES: HistorySeries = {
  range: "1m",
  points: [
    { timestamp: START, value: 189_738.58 },
    { timestamp: START + 30 * DAY, value: 192_157.48 },
  ],
  first: 189_738.58,
  last: 192_157.48,
  min: 189_738.58,
  max: 192_157.48,
  change: 2418.9,
  changeRatio: 0.0127,
  isEmpty: false,
}

const BALANCES: AccountBalancesView = {
  accounts: [],
  groups: [],
  total: 0,
  netWorth: 0,
  unmatchedValue: 0,
  unmatchedAccountIds: [],
  assetsTotal: 0,
  liabilitiesTotal: 0,
  liquidTotal: 0,
  ratelessCount: 0,
  isDegraded: false,
}

const OVERVIEW: PortfolioOverviewView = {
  scope: { kind: "portfolio" },
  assets: [],
  assetsById: {},
  positions: [],
  cash: [],
  totals: {
    marketValue: 108_400.32,
    totalCostBasis: 94_000,
    realisedGains: 0,
    unrealisedGains: 14_400.32,
    totalGains: 14_400.32,
    totalFees: 0,
    cashDividends: 0,
    returnRatio: 0.15,
  },
  assetCount: 6,
  accountCount: 3,
  largestAllocationShare: 0.367,
  appliesOwnershipShare: true,
  fifoScope: "per-account",
  isLifetimeOnly: true,
  lookups: { assetsById: {}, accountsById: {} },
}

const LEDGER: LedgerResult = {
  rows: [],
  days: [],
  lookup: EMPTY_LOOKUP,
  plan: planLedgerQuery([]),
  source: "combined",
  loadedCount: 0,
  unreviewedLoadedCount: 0,
  totalResults: 0,
  isEmpty: true,
  isEmptyBecauseFiltered: false,
  isPending: false,
  isPlaceholder: false,
  isError: false,
  error: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetching: false,
  fetchNextPage: () => {},
  refetch: () => {},
}

vi.mock("@/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/auth")>()),
  useUserId: () => USER_ID,
  useBaseCurrency: () => "GBP",
  useAuthMe: () => ({ data: { user_metadata: { username: "Alex Fletcher" } } }),
}))

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  useRequiredBaseAssetId: () => 1,
  usePortfolioHistorySuspense: () => SERIES,
  usePortfolioOverviewSuspense: () => OVERVIEW,
}))

vi.mock("@/features/accounts/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/accounts/api")>()),
  useAccountBalancesSuspense: () => BALANCES,
}))

vi.mock("@/features/transactions/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/transactions/api")>()),
  useLedger: () => LEDGER,
}))

const { DashboardScreen } = await import("./dashboard-screen")

function withClient(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(
    queryKeys.user(USER_ID).connectors.bindings.list(),
    buildAccountConnectors({ bindings: [] })
  )
  client.setQueryData(queryKeys.user(USER_ID).ai.quickUploads.list(), [
    quickUpload("a"),
    quickUpload("b"),
  ])
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>
}

beforeEach(() => {
  stubViewport(1440)
})

describe("DashboardScreen", () => {
  it("answers how am I doing in one screen", async () => {
    await renderInRouter(withClient(<DashboardScreen />))

    expect(
      screen.getByText(/^Good (morning|afternoon|evening), Alex$/)
    ).toBeVisible()
    expect(
      document.querySelector('[data-slot="hero-chart-value"]')?.textContent
    ).toContain("192,157.48")
    expect(document.querySelector('[data-slot="needs-you"]')).not.toBeNull()
    expect(
      document.querySelector('[data-slot="investments-panel"]')
    ).not.toBeNull()
    expect(screen.getByText("Nothing here yet")).toBeVisible()
  })

  it("keeps the five-bucket breakdown behind a disclosure", async () => {
    await renderInRouter(withClient(<DashboardScreen />))
    expect(document.querySelector('[data-slot="attribution-panel"]')).toBeNull()
    expect(screen.getByRole("button", { name: /why/i })).toBeVisible()
  })

  it("adds no search field of its own — ⌘K is the search", async () => {
    await renderInRouter(withClient(<DashboardScreen />))
    expect(screen.queryByRole("searchbox")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("draws exactly one chart", async () => {
    await renderInRouter(withClient(<DashboardScreen />))
    expect(document.querySelectorAll('[data-slot="hero-chart"]')).toHaveLength(
      1
    )
  })
})
