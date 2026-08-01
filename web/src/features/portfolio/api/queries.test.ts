import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  AccountPortfolioApiFactory,
  AccountsApiFactory,
  PortfolioApiFactory,
} from "@/api"
import { api } from "@/lib/api"
import { createQueryClient, queryKeys } from "@/lib/query"

import { accountsQueryOptions } from "@/features/accounts/api"

import {
  accountPortfolioHistoryQueryOptions,
  accountPortfolioOverviewQueryOptions,
  assetOverviewQueryOptions,
  holdingsQueryOptions,
  portfolioHistoryQueryOptions,
  portfolioOverviewQueryOptions,
} from "./index"

vi.mock("@/lib/api", () => ({ api: vi.fn() }))

const USER = "00000000-0000-0000-0000-000000000000"
const ACCOUNT = "11111111-1111-1111-1111-111111111111"
const GBP = 1

const emptyHoldings = {
  data: { holdings: [], lookup_tables: { accounts: [], assets: [] } },
}
const emptyOverview = {
  data: {
    portfolios: { asset_portfolios: [], cash_portfolios: [] },
    lookup_tables: { accounts: [], assets: [] },
  },
}
const emptyHistory = { data: { range: "1m", sums: [] } }
const emptyAccounts = {
  data: {
    accounts: [],
    lookup_tables: {
      account_types: [],
      account_liquidity_types: [],
      assets: [],
    },
  },
}

const methods = {
  getHoldings: vi.fn(),
  getNetworthHistory: vi.fn(),
  getPortfolioOverview: vi.fn(),
  getPortfolioAssetOverview: vi.fn(),
  getAccountNetworthHistory: vi.fn(),
  getAccountPortfolioOverview: vi.fn(),
  getAccounts: vi.fn(),
}

beforeEach(() => {
  vi.mocked(api).mockReturnValue(methods as never)
  methods.getHoldings.mockResolvedValue(emptyHoldings)
  methods.getNetworthHistory.mockResolvedValue(emptyHistory)
  methods.getPortfolioOverview.mockResolvedValue(emptyOverview)
  methods.getPortfolioAssetOverview.mockResolvedValue(emptyOverview)
  methods.getAccountNetworthHistory.mockResolvedValue(emptyHistory)
  methods.getAccountPortfolioOverview.mockResolvedValue(emptyOverview)
  methods.getAccounts.mockResolvedValue(emptyAccounts)
})

describe("query wiring", () => {
  it("fetches holdings through the bound factory and caches the derived view", async () => {
    const client = createQueryClient()
    const options = holdingsQueryOptions({
      userId: USER,
      defaultAssetId: GBP,
    })

    expect(options.queryKey).toEqual(
      queryKeys
        .user(USER)
        .portfolio.holdings({ defaultAssetId: GBP, applyOwnershipShare: true })
    )

    const view = await client.fetchQuery(options)
    expect(vi.mocked(api)).toHaveBeenCalledWith(PortfolioApiFactory)
    expect(methods.getHoldings).toHaveBeenCalledWith(
      USER,
      GBP,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(view.totalValue).toBe(0)
    expect(client.getQueryData(options.queryKey)).toBe(view)
  })

  it("passes the range and base asset to net worth history", async () => {
    const client = createQueryClient()
    const options = portfolioHistoryQueryOptions({
      userId: USER,
      defaultAssetId: GBP,
      range: "3m",
    })
    expect(options.queryKey).toEqual(
      queryKeys.user(USER).portfolio.history({
        defaultAssetId: GBP,
        range: "3m",
      })
    )
    await client.fetchQuery(options)
    expect(methods.getNetworthHistory).toHaveBeenCalledWith(
      USER,
      "3m",
      GBP,
      expect.anything()
    )
  })

  it("keys the portfolio and asset overviews apart", async () => {
    const client = createQueryClient()
    await client.fetchQuery(
      portfolioOverviewQueryOptions({ userId: USER, defaultAssetId: GBP })
    )
    const assetOptions = assetOverviewQueryOptions({
      userId: USER,
      assetId: 5,
      defaultAssetId: GBP,
    })
    const assetView = await client.fetchQuery(assetOptions)

    expect(methods.getPortfolioOverview).toHaveBeenCalledWith(
      USER,
      GBP,
      expect.anything()
    )
    expect(methods.getPortfolioAssetOverview).toHaveBeenCalledWith(
      USER,
      5,
      GBP,
      expect.anything()
    )
    expect(assetOptions.queryKey).toEqual(
      queryKeys.user(USER).portfolio.assetOverview(5, { defaultAssetId: GBP })
    )
    expect(assetView.scope).toEqual({ kind: "asset", assetId: 5 })
  })

  it("nests the account-scoped queries under the account", async () => {
    const client = createQueryClient()
    const overview = accountPortfolioOverviewQueryOptions({
      userId: USER,
      accountId: ACCOUNT,
      defaultAssetId: GBP,
    })
    const history = accountPortfolioHistoryQueryOptions({
      userId: USER,
      accountId: ACCOUNT,
      defaultAssetId: GBP,
      range: "1y",
    })

    expect(overview.queryKey).toEqual(
      queryKeys
        .user(USER)
        .accounts.portfolioOverview(ACCOUNT, { defaultAssetId: GBP })
    )
    const detailKey = queryKeys.user(USER).accounts.detail(ACCOUNT)
    expect(history.queryKey.slice(0, detailKey.length)).toEqual([...detailKey])

    const view = await client.fetchQuery(overview)
    await client.fetchQuery(history)

    expect(methods.getAccountPortfolioOverview).toHaveBeenCalledWith(
      USER,
      ACCOUNT,
      GBP,
      expect.anything()
    )
    expect(methods.getAccountNetworthHistory).toHaveBeenCalledWith(
      USER,
      ACCOUNT,
      "1y",
      GBP,
      expect.anything()
    )
    expect(view.appliesOwnershipShare).toBe(false)
    expect(vi.mocked(api).mock.calls.flat()).toContain(
      AccountPortfolioApiFactory
    )
  })

  it("passes the user id, not an interceptor, to the accounts list", async () => {
    const client = createQueryClient()
    const options = accountsQueryOptions(USER)
    expect(options.queryKey).toEqual(queryKeys.user(USER).accounts.list())
    await client.fetchQuery(options)
    expect(vi.mocked(api)).toHaveBeenCalledWith(AccountsApiFactory)
    expect(methods.getAccounts).toHaveBeenCalledWith(USER, expect.anything())
  })
})
