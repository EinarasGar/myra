import type { InfiniteData } from "@tanstack/react-query"
import { useQueries, useSuspenseQuery } from "@tanstack/react-query"

import type {
  AssetPairMetadata,
  AssetsPage,
  GetAssetPairRatesResponse,
  SharedAssetPairMetadata,
} from "@/api"
import { AssetsApiFactory, UserAssetsApiFactory } from "@/api"
import { api, apiClient } from "@/lib/api"
import type { AssetRef } from "@/lib/domain/refs"
import { toAssetRef } from "@/lib/domain/refs"
import type { AssetId, PortfolioRange, UserId } from "@/lib/query"
import {
  apiQueryOptions,
  flattenPages,
  offsetInfiniteQueryOptions,
  queryKeys,
  STALE_TIMES,
  totalResultsOf,
  withNormalizedErrors,
} from "@/lib/query"

import type { AssetDetail, AssetQuote, AssetTypeRef, RatePoint } from "./types"
import {
  toAssetDetail,
  toAssetQuote,
  toAssetTypeRef,
  toRatePoints,
} from "./types"

export const ASSET_SEARCH_PAGE_SIZE = 25

export interface AssetSearchInput {
  query?: string
  assetType?: number
  count?: number
}

export function assetTypesQueryOptions() {
  return apiQueryOptions({
    queryKey: queryKeys.reference.assetTypes(),
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<AssetTypeRef[]> => {
      const response = await api(AssetsApiFactory).getAssetTypes({ signal })
      return response.data.asset_types.map(toAssetTypeRef)
    },
    meta: { errorContext: "Asset types could not be loaded" },
  })
}

export function assetSearchInfiniteQueryOptions(input: AssetSearchInput = {}) {
  const count = input.count ?? ASSET_SEARCH_PAGE_SIZE
  const query = input.query?.trim() === "" ? undefined : input.query
  return offsetInfiniteQueryOptions({
    queryKey: queryKeys.reference.assets.search({
      count,
      query,
      assetType: input.assetType,
    }),
    staleTime: STALE_TIMES.standard,
    fetchPage: async ({ start, signal }): Promise<AssetsPage> => {
      const response = await api(AssetsApiFactory).searchAssets(
        count,
        start,
        query,
        input.assetType,
        { signal }
      )
      return response.data
    },
    meta: { errorContext: "Assets could not be searched" },
  })
}

export interface AssetSearchResult {
  readonly assets: readonly AssetRef[]
  readonly totalResults: number | undefined
}

export function toAssetSearchResult(
  data: InfiniteData<AssetsPage> | undefined
): AssetSearchResult {
  return {
    assets: flattenPages(data).map(toAssetRef),
    totalResults: totalResultsOf(data),
  }
}

export function assetQueryOptions(assetId: AssetId) {
  return apiQueryOptions({
    queryKey: queryKeys.reference.assets.detail(assetId),
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<AssetDetail> => {
      const response = await api(AssetsApiFactory).getAsset(assetId, { signal })
      return toAssetDetail(assetId, response.data)
    },
    meta: { errorContext: "The asset could not be loaded" },
  })
}

export interface AssetPairDetail {
  readonly quote: AssetQuote | null
  readonly volume: number | null
  readonly exchange: string | null
}

export function assetPairQueryOptions(assetId: AssetId, referenceId: AssetId) {
  return apiQueryOptions({
    queryKey: queryKeys.reference.assets.pair(assetId, referenceId),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<AssetPairDetail> => {
      const response = await api(AssetsApiFactory).getAssetPair(
        assetId,
        referenceId,
        { signal }
      )
      const metadata = response.data.metadata as
        Partial<SharedAssetPairMetadata> | undefined
      return {
        quote: toAssetQuote(metadata),
        volume: metadata?.volume ?? null,
        exchange: null,
      }
    },
    meta: { errorContext: "The asset pair could not be loaded" },
  })
}

export function assetPairRatesQueryOptions(
  assetId: AssetId,
  referenceId: AssetId,
  range: PortfolioRange
) {
  return apiQueryOptions({
    queryKey: queryKeys.reference.assets.pairRates(assetId, referenceId, {
      range,
    }),
    staleTime: STALE_TIMES.standard,
    fetch: async ({ signal }): Promise<RatePoint[]> => {
      const response = await api(AssetsApiFactory).getAssetPairRates(
        assetId,
        referenceId,
        range,
        { signal }
      )
      return toRatePoints(response.data.rates)
    },
    meta: { errorContext: "Asset rates could not be loaded" },
  })
}

export function assetQuoteQueryOptions(assetId: AssetId, referenceId: AssetId) {
  return apiQueryOptions({
    queryKey: queryKeys.reference.assets.converted(assetId, referenceId),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<AssetQuote | null> => {
      const response = await api(AssetsApiFactory).getAssetPairConverted(
        assetId,
        referenceId,
        { signal }
      )
      return toAssetQuote(response.data as Partial<AssetPairMetadata>)
    },
    meta: { errorContext: "The asset price could not be loaded" },
  })
}

export function assetConvertedRatesQueryOptions(
  assetId: AssetId,
  referenceId: AssetId,
  range: PortfolioRange
) {
  return apiQueryOptions({
    queryKey: queryKeys.reference.assets.convertedRates(assetId, referenceId, {
      range,
    }),
    staleTime: STALE_TIMES.standard,
    fetch: async ({ signal }): Promise<RatePoint[]> => {
      const response = await api(AssetsApiFactory).getAssetPairConvertedRates(
        range,
        assetId,
        referenceId,
        { signal }
      )
      return toRatePoints(response.data.rates)
    },
    meta: { errorContext: "Asset rates could not be loaded" },
  })
}

export function userAssetsQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).assets.list(),
    staleTime: STALE_TIMES.standard,
    fetch: async ({ signal }): Promise<AssetRef[]> => {
      const response = await api(UserAssetsApiFactory).getUserAssets(userId, {
        signal,
      })
      return response.data.results.map(toAssetRef)
    },
    meta: { errorContext: "Your custom assets could not be loaded" },
  })
}

/**
 * Custom assets are the only ones a user can price by hand, and the only signal that an
 * asset is one is its presence in this list — `GET /assets/{id}` looks identical for a
 * market-priced asset.
 */
export function useCustomAssetRef(
  userId: UserId,
  assetId: AssetId
): AssetRef | null {
  const assets = useSuspenseQuery(userAssetsQueryOptions(userId)).data
  return assets.find((asset) => asset.assetId === assetId) ?? null
}

export function userAssetQueryOptions(userId: UserId, assetId: AssetId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).assets.detail(assetId),
    staleTime: STALE_TIMES.standard,
    fetch: async ({ signal }): Promise<AssetDetail> => {
      const response = await api(UserAssetsApiFactory).getUserAsset(
        userId,
        assetId,
        { signal }
      )
      return toAssetDetail(assetId, response.data)
    },
    meta: { errorContext: "The asset could not be loaded" },
  })
}

export function userAssetPairQueryOptions(
  userId: UserId,
  assetId: AssetId,
  referenceId: AssetId
) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).assets.pair(assetId, referenceId),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<AssetPairDetail> => {
      const response = await api(UserAssetsApiFactory).getUserAssetPair(
        userId,
        assetId,
        referenceId,
        { signal }
      )
      return {
        quote: toAssetQuote(response.data.metadata),
        volume: null,
        exchange: response.data.user_metadata?.exchange ?? null,
      }
    },
    meta: { errorContext: "The asset pair could not be loaded" },
  })
}

export function userAssetPairRatesQueryOptions(
  userId: UserId,
  assetId: AssetId,
  referenceId: AssetId,
  range: PortfolioRange
) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(userId)
      .assets.pairRates(assetId, referenceId, { range }),
    staleTime: STALE_TIMES.standard,
    fetch: async ({ signal }): Promise<RatePoint[]> => {
      const response = await api(UserAssetsApiFactory).getUserAssetPairRates(
        userId,
        assetId,
        referenceId,
        range,
        { signal }
      )
      return toRatePoints(response.data.rates)
    },
    meta: { errorContext: "Asset rates could not be loaded" },
  })
}

function userAssetPath(
  userId: UserId,
  assetId: AssetId,
  referenceId: AssetId,
  suffix: string
): string {
  return `/api/users/${encodeURIComponent(userId)}/assets/${assetId}/${referenceId}/${suffix}`
}

/**
 * FIXME: `getUserAssetPairConverted`/`getUserAssetPairConvertedRates` are unusable in
 * the generated client — `user_asset_handler.rs` declares no `params(...)` on those two
 * `#[utoipa::path]` blocks, so the generator emits the route with `{user_id}`,
 * `{asset_id}` and `{reference_id}` unsubstituted. Add the params upstream, re-run
 * `make generate-api`, and delete these two request helpers.
 */
async function fetchUserConverted(
  userId: UserId,
  assetId: AssetId,
  referenceId: AssetId,
  signal: AbortSignal
): Promise<AssetQuote | null> {
  const response = await apiClient.get<Partial<AssetPairMetadata>>(
    userAssetPath(userId, assetId, referenceId, "converted"),
    { signal }
  )
  return toAssetQuote(response.data)
}

async function fetchUserConvertedRates(
  userId: UserId,
  assetId: AssetId,
  referenceId: AssetId,
  range: PortfolioRange,
  signal: AbortSignal
): Promise<RatePoint[]> {
  const response = await apiClient.get<GetAssetPairRatesResponse>(
    userAssetPath(userId, assetId, referenceId, "converted/rates"),
    { params: { range }, signal }
  )
  return toRatePoints(response.data.rates)
}

export function userAssetQuoteQueryOptions(
  userId: UserId,
  assetId: AssetId,
  referenceId: AssetId
) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).assets.converted(assetId, referenceId),
    staleTime: STALE_TIMES.short,
    fetch: ({ signal }) =>
      withNormalizedErrors(() =>
        fetchUserConverted(userId, assetId, referenceId, signal)
      ),
    meta: { errorContext: "The asset value could not be loaded" },
  })
}

export function userAssetConvertedRatesQueryOptions(
  userId: UserId,
  assetId: AssetId,
  referenceId: AssetId,
  range: PortfolioRange
) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(userId)
      .assets.convertedRates(assetId, referenceId, { range }),
    staleTime: STALE_TIMES.standard,
    fetch: ({ signal }) =>
      withNormalizedErrors(() =>
        fetchUserConvertedRates(userId, assetId, referenceId, range, signal)
      ),
    meta: { errorContext: "Asset rates could not be loaded" },
  })
}

export type CustomAssetValuationStatus = "loading" | "valued" | "unpriced"

export interface CustomAssetValuation {
  readonly asset: AssetRef
  readonly quote: AssetQuote | null
  readonly status: CustomAssetValuationStatus
}

/**
 * There is no bulk valuation route, so each custom asset needs its own converted-rate
 * call. Failures and missing rate paths degrade to `unpriced` for that row rather than
 * failing the list.
 */
export function useCustomAssetValuations(
  userId: UserId,
  referenceAssetId: AssetId
): readonly CustomAssetValuation[] {
  const assets = useSuspenseQuery(userAssetsQueryOptions(userId)).data

  return useQueries({
    queries: assets.map((asset) => ({
      ...userAssetQuoteQueryOptions(userId, asset.assetId, referenceAssetId),
      meta: { suppressGlobalError: true },
    })),
    combine: (results): readonly CustomAssetValuation[] =>
      assets.map((asset, index): CustomAssetValuation => {
        const result = results[index]
        if (result === undefined || result.isPending) {
          return { asset, quote: null, status: "loading" }
        }
        const quote = result.data ?? null
        return { asset, quote, status: quote === null ? "unpriced" : "valued" }
      }),
  })
}
