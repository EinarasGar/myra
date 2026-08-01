import type { InfiniteData } from "@tanstack/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { Suspense } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AssetsPage } from "@/api"
import { AssetsApiFactory } from "@/api"
import { queryKeys } from "@/lib/query"

const stubs = vi.hoisted(() => ({
  searchAssets: vi.fn(),
  getAsset: vi.fn(),
  getAssetPair: vi.fn(),
  getAssetPairConverted: vi.fn(),
  getUserAssets: vi.fn(),
  postCustomAsset: vi.fn(),
  putCustomAsset: vi.fn(),
  deleteAsset: vi.fn(),
  clientGet: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: (factory: unknown) =>
    factory === AssetsApiFactory
      ? {
          searchAssets: stubs.searchAssets,
          getAsset: stubs.getAsset,
          getAssetPair: stubs.getAssetPair,
          getAssetPairConverted: stubs.getAssetPairConverted,
        }
      : {
          getUserAssets: stubs.getUserAssets,
          postCustomAsset: stubs.postCustomAsset,
          putCustomAsset: stubs.putCustomAsset,
          deleteAsset: stubs.deleteAsset,
        },
  apiClient: { get: stubs.clientGet },
}))

const {
  assetPairQueryOptions,
  assetQuoteQueryOptions,
  toAssetSearchResult,
  useCustomAssetValuations,
  userAssetConvertedRatesQueryOptions,
  userAssetQuoteQueryOptions,
} = await import("./queries")
const { fromUnixSeconds, toAssetDetail, toAssetQuote, toRatePoints } =
  await import("./types")
const {
  CURRENCY_ASSET_TYPE_ID,
  isCurrencyAsset,
  isCurrencyAssetType,
  toAssetRef,
} = await import("@/lib/domain/refs")
const { customAssetFormSchema } = await import("./schemas")
const { useDeleteCustomAsset } = await import("./mutations")

const USER = "00000000-0000-0000-0000-000000000000"

function runQuery<T>(options: { queryFn?: unknown }): Promise<T> {
  const queryFn = options.queryFn as (context: {
    signal: AbortSignal
  }) => Promise<T>
  return queryFn({ signal: new AbortController().signal })
}

function testClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <Suspense fallback="loading">{children}</Suspense>
      </QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("normalisers", () => {
  it("maps a search row", () => {
    expect(
      toAssetRef({
        asset_id: 4,
        ticker: "VUSA.LSE",
        name: "Vanguard S&P 500",
        asset_type: 5,
      })
    ).toEqual({
      assetId: 4,
      ticker: "VUSA.LSE",
      name: "Vanguard S&P 500",
      assetTypeId: 5,
    })
  })

  it("maps a detail with and without a base asset", () => {
    const detail = toAssetDetail(4, {
      ticker: "VUSA.LSE",
      name: "Vanguard S&P 500",
      asset_type: { id: 5, name: "ETFs" },
      base_asset: { asset_id: 1, ticker: "GBP", name: "Pound" },
      pairs: [{ asset_id: 2, ticker: "USD", name: "Dollar" }],
    })
    expect(detail.baseAsset?.ticker).toBe("GBP")
    expect(detail.pairs).toHaveLength(1)

    const rateless = toAssetDetail(9, {
      ticker: "FLAT",
      name: "Flat",
      asset_type: { id: 8, name: "Real Estate" },
      base_asset: null,
      pairs: [],
    })
    expect(rateless.baseAsset).toBeNull()
  })

  it("treats a flattened empty metadata object as no quote", () => {
    expect(toAssetQuote({})).toBeNull()
    expect(toAssetQuote(null)).toBeNull()
    expect(toAssetQuote(undefined)).toBeNull()
    expect(toAssetQuote({ latest_rate: 1.16 })).toBeNull()
  })

  it("reads unix seconds as a date", () => {
    const quote = toAssetQuote({ latest_rate: 1.1642, last_updated: 1_752_000 })
    expect(quote?.rate).toBe(1.1642)
    expect(quote?.asOf.getTime()).toBe(1_752_000_000)
    expect(fromUnixSeconds(0).getTime()).toBe(0)
  })

  it("maps a rate series", () => {
    expect(toRatePoints([{ date: 1_752_000, rate: 2 }])).toEqual([
      { date: new Date(1_752_000_000), rate: 2 },
    ])
  })

  it("identifies currencies by asset type 1", () => {
    expect(CURRENCY_ASSET_TYPE_ID).toBe(1)
    expect(
      isCurrencyAsset({
        assetId: 1,
        ticker: "GBP",
        name: "Pound",
        assetTypeId: 1,
      })
    ).toBe(true)
    expect(
      isCurrencyAsset({
        assetId: 4,
        ticker: "VUSA",
        name: "Vanguard",
        assetTypeId: 5,
      })
    ).toBe(false)
    expect(isCurrencyAssetType(1)).toBe(true)
    expect(isCurrencyAssetType(null)).toBe(false)
  })

  it("cannot decide currency from a pair row, which carries no asset type", () => {
    const detail = toAssetDetail(4, {
      ticker: "VUSA.LSE",
      name: "Vanguard S&P 500",
      asset_type: { id: 5, name: "ETFs" },
      base_asset: { asset_id: 1, ticker: "GBP", name: "Pound" },
      pairs: [],
    })
    expect(detail.baseAsset?.assetTypeId).toBeNull()
    expect(detail.baseAsset && isCurrencyAsset(detail.baseAsset)).toBe(false)
    expect(isCurrencyAssetType(detail.assetType.id)).toBe(false)
  })

  it("flattens search pages and keeps the total", () => {
    const data: InfiniteData<AssetsPage> = {
      pages: [
        {
          results: [
            { asset_id: 1, ticker: "GBP", name: "Pound", asset_type: 1 },
          ],
          total_results: 2,
          lookup_tables: { asset_types: [] },
        },
        {
          results: [
            { asset_id: 2, ticker: "USD", name: "Dollar", asset_type: 1 },
          ],
          total_results: 2,
          lookup_tables: { asset_types: [] },
        },
      ],
      pageParams: [0, 1],
    }
    const result = toAssetSearchResult(data)
    expect(result.assets.map((asset) => asset.ticker)).toEqual(["GBP", "USD"])
    expect(result.totalResults).toBe(2)
    expect(toAssetSearchResult(undefined).assets).toEqual([])
  })
})

describe("pair queries", () => {
  it("returns no quote when the shared pair has never been priced", async () => {
    stubs.getAssetPair.mockResolvedValue({
      data: {
        main_asset: {},
        reference_asset: {},
        metadata: { volume: 27_681_777 },
      },
    })
    const detail = await runQuery<{ quote: unknown; volume: number | null }>(
      assetPairQueryOptions(4, 1)
    )
    expect(detail.quote).toBeNull()
    expect(detail.volume).toBe(27_681_777)
  })

  it("returns a quote from the shared converted route", async () => {
    stubs.getAssetPairConverted.mockResolvedValue({
      data: { latest_rate: 84.1, last_updated: 1_752_000 },
    })
    const quote = await runQuery<{ rate: number } | null>(
      assetQuoteQueryOptions(4, 1)
    )
    expect(quote?.rate).toBe(84.1)
  })
})

describe("user converted routes (generated client cannot express them)", () => {
  it("substitutes every path parameter", async () => {
    stubs.clientGet.mockResolvedValue({
      data: { latest_rate: 164_000, last_updated: 1_752_000 },
    })
    const quote = await runQuery<{ rate: number } | null>(
      userAssetQuoteQueryOptions(USER, 42, 1)
    )
    expect(stubs.clientGet).toHaveBeenCalledWith(
      `/api/users/${USER}/assets/42/1/converted`,
      expect.anything()
    )
    expect(quote?.rate).toBe(164_000)
  })

  it("passes the range as a query parameter on the rates series", async () => {
    stubs.clientGet.mockResolvedValue({ data: { range: "1m", rates: [] } })
    await runQuery(userAssetConvertedRatesQueryOptions(USER, 42, 1, "1m"))
    expect(stubs.clientGet).toHaveBeenCalledWith(
      `/api/users/${USER}/assets/42/1/converted/rates`,
      expect.objectContaining({ params: { range: "1m" } })
    )
  })

  it("keys the quote under the user asset pair", () => {
    expect(userAssetQuoteQueryOptions(USER, 42, 1).queryKey).toEqual(
      queryKeys.user(USER).assets.converted(42, 1)
    )
  })
})

describe("useCustomAssetValuations", () => {
  it("reports a value per asset and degrades a rateless one", async () => {
    stubs.getUserAssets.mockResolvedValue({
      data: {
        results: [
          { asset_id: 42, ticker: "FLAT", name: "Flat", asset_type: 8 },
          { asset_id: 43, ticker: "WATCH", name: "Watch", asset_type: 8 },
        ],
        lookup_tables: { asset_types: [] },
      },
    })
    stubs.clientGet.mockImplementation((path: string) =>
      path.includes("/42/")
        ? Promise.resolve({
            data: { latest_rate: 164_000, last_updated: 1_752_000 },
          })
        : Promise.resolve({ data: {} })
    )

    const { result } = renderHook(() => useCustomAssetValuations(USER, 1), {
      wrapper: wrapper(testClient()),
    })

    await waitFor(() => {
      expect(result.current).toHaveLength(2)
      expect(result.current[0]?.status).toBe("valued")
      expect(result.current[1]?.status).toBe("unpriced")
    })
    expect(result.current[0]?.quote?.rate).toBe(164_000)
    expect(result.current[1]?.quote).toBeNull()
  })
})

describe("custom asset mutations", () => {
  it("removes optimistically and restores on failure", async () => {
    const client = testClient()
    const rows = [{ assetId: 42, ticker: "FLAT", name: "Flat", assetTypeId: 8 }]
    client.setQueryData(queryKeys.user(USER).assets.list(), rows)
    stubs.deleteAsset.mockRejectedValue({ kind: "conflict" })

    const { result } = renderHook(() => useDeleteCustomAsset(USER), {
      wrapper: wrapper(client),
    })
    result.current.mutate({ assetId: 42 })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(queryKeys.user(USER).assets.list())).toEqual(
      rows
    )
  })
})

describe("custom asset form schema", () => {
  it("mirrors the server length rules", () => {
    expect(
      customAssetFormSchema.safeParse({
        ticker: "  FLAT  ",
        name: "Flat — 14 Bishopsgate",
        asset_type: 8,
        base_asset_id: 1,
      }).data?.ticker
    ).toBe("FLAT")

    expect(
      customAssetFormSchema.safeParse({
        ticker: "x".repeat(21),
        name: "Flat",
        asset_type: 8,
        base_asset_id: 1,
      }).error?.issues[0]?.message
    ).toBe("Must be between 1 and 20 characters.")

    expect(
      customAssetFormSchema.safeParse({
        ticker: "FLAT",
        name: "Flat",
        asset_type: 8,
        base_asset_id: 0,
      }).success
    ).toBe(false)
  })
})
