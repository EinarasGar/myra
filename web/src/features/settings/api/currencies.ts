import { useInfiniteQuery, useQueries } from "@tanstack/react-query"

import type { AssetRef } from "@/lib/domain/refs"
import { CURRENCY_ASSET_TYPE_ID } from "@/lib/domain/refs"
import type { AssetQuote } from "@/features/assets/api"
import {
  assetQuoteQueryOptions,
  assetSearchInfiniteQueryOptions,
  toAssetSearchResult,
} from "@/features/assets/api"

export const CURRENCY_OPTION_PAGE_SIZE = 12

export type CurrencyRateStatus = "current" | "loading" | "priced" | "unpriced"

export interface CurrencyOption {
  readonly asset: AssetRef
  readonly isCurrent: boolean
  readonly quote: AssetQuote | null
  readonly status: CurrencyRateStatus
}

export interface CurrencyOptionsView {
  readonly options: readonly CurrencyOption[]
  readonly totalResults: number | undefined
  /** Rows the search itself returned — the pinned current currency is not one of them. */
  readonly shown: number
  readonly isPending: boolean
}

/**
 * One converted-rate call per listed currency: there is no bulk rate route, so the
 * list is capped at a page and rates are only fetched for the rows on screen. The
 * currency in use is always first, because an alphabetical page rarely contains it
 * and a picker that cannot show your current answer is not a picker.
 */
export function useCurrencyOptions(
  current: AssetRef,
  query: string
): CurrencyOptionsView {
  const search = useInfiniteQuery(
    assetSearchInfiniteQueryOptions({
      query,
      assetType: CURRENCY_ASSET_TYPE_ID,
      count: CURRENCY_OPTION_PAGE_SIZE,
    })
  )
  const found = toAssetSearchResult(search.data)
  const others = found.assets.filter(
    (asset) => asset.assetId !== current.assetId
  )
  const inResults = found.assets.find(
    (asset) => asset.assetId === current.assetId
  )
  const assets = [inResults ?? current, ...others]
  const totalResults = found.totalResults
  const isPending = search.isPending
  const shown = others.length + (inResults === undefined ? 0 : 1)

  return useQueries({
    queries: others.map((asset) => ({
      ...assetQuoteQueryOptions(current.assetId, asset.assetId),
      meta: { suppressGlobalError: true },
    })),
    combine: (results): CurrencyOptionsView => ({
      totalResults,
      isPending,
      shown,
      options: assets.map((asset, index): CurrencyOption => {
        if (index === 0) {
          return { asset, isCurrent: true, quote: null, status: "current" }
        }
        const result = results[index - 1]
        if (result === undefined || result.isPending) {
          return { asset, isCurrent: false, quote: null, status: "loading" }
        }
        const quote = result.data ?? null
        return {
          asset,
          isCurrent: false,
          quote,
          status: quote === null ? "unpriced" : "priced",
        }
      }),
    }),
  })
}
