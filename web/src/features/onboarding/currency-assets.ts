import { useSuspenseQuery } from "@tanstack/react-query"

import { AssetsApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { AssetRef } from "@/lib/domain/refs"
import {
  assetLabel,
  CURRENCY_ASSET_TYPE_ID,
  toAssetRef,
} from "@/lib/domain/refs"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

const CURRENCY_PAGE_SIZE = 500

/**
 * Not `reference.assets.search(...)`: this serves a sorted `AssetRef[]`, while
 * `assetSearchInfiniteQueryOptions` serves `{ pages, pageParams }` from that key family
 * for any argument the picker passes.
 */
const CURRENCY_ASSETS_KEY = [
  ...queryKeys.reference.assets.all(),
  "currencies",
] as const

export function currencyAssetsQueryOptions() {
  return apiQueryOptions({
    queryKey: CURRENCY_ASSETS_KEY,
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<AssetRef[]> => {
      const response = await api(AssetsApiFactory).searchAssets(
        CURRENCY_PAGE_SIZE,
        0,
        undefined,
        CURRENCY_ASSET_TYPE_ID,
        { signal }
      )
      return response.data.results
        .map(toAssetRef)
        .sort((a, b) => assetLabel(a).localeCompare(assetLabel(b)))
    },
    meta: { errorContext: "Currencies could not be loaded" },
  })
}

export function useCurrencyAssets() {
  return useSuspenseQuery(currencyAssetsQueryOptions()).data
}
