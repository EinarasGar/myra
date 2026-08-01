import { useEffect, useMemo, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import type { AssetRef } from "@/lib/domain/refs"

import { assetSearchInfiniteQueryOptions, toAssetSearchResult } from "./queries"

export const ASSET_SEARCH_DEBOUNCE_MS = 275

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value)
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return settled
}

export interface AssetSearchState {
  readonly query: string
  readonly setQuery: (query: string) => void
  readonly assets: readonly AssetRef[]
  readonly total: number | null
  readonly pending: boolean
  readonly hasMore: boolean
  readonly loadMore: () => void
}

/**
 * The universe of assets is far larger than one page, so the picker searches the server.
 * Every keystroke would be a request without the debounce, and the settled query is what
 * decides whether a request is worth making at all.
 */
export function useAssetSearch(
  delay: number = ASSET_SEARCH_DEBOUNCE_MS
): AssetSearchState {
  const [query, setQuery] = useState("")
  const settled = useDebouncedValue(query, delay).trim()
  const active = settled !== ""

  const search = useInfiniteQuery({
    ...assetSearchInfiniteQueryOptions({ query: settled }),
    enabled: active,
  })

  const result = useMemo(() => toAssetSearchResult(search.data), [search.data])

  return {
    query,
    setQuery,
    assets: active ? result.assets : [],
    total: active ? (result.totalResults ?? null) : null,
    pending: active && (search.isFetching || query.trim() !== settled),
    hasMore: active && search.hasNextPage,
    loadMore: () => {
      if (!search.hasNextPage || search.isFetchingNextPage) return
      void search.fetchNextPage()
    },
  }
}
