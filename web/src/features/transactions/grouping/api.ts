import { useMemo, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import type { GroupTransactionItem, TransactionGroupsPage } from "@/api"
import { TransactionGroupsApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { UserId } from "@/lib/query"
import { cursorInfiniteQueryOptions, queryKeys } from "@/lib/query"
import { useDebouncedValue } from "@/features/assets/api"

import type { LedgerGroupRow, LedgerTransactionRow, LookupIndex } from "../api"
import {
  EMPTY_LOOKUP,
  individualLedgerInfiniteQueryOptions,
  mergeLookupIndexes,
  toGroupRow,
  toLookupIndex,
  toTransactionRow,
} from "../api"

export const GROUP_SEARCH_DEBOUNCE_MS = 275
const SEARCH_PAGE_SIZE = 20

export function transactionGroupsInfiniteQueryOptions(input: {
  userId: UserId
  query: string | undefined
  limit?: number
}) {
  const limit = input.limit ?? SEARCH_PAGE_SIZE
  return cursorInfiniteQueryOptions({
    queryKey: queryKeys
      .user(input.userId)
      .transactions.groups.list({ limit, query: input.query }),
    fetchPage: async ({ cursor, signal }): Promise<TransactionGroupsPage> => {
      const response = await api(
        TransactionGroupsApiFactory
      ).getTransactionGroups(
        input.userId,
        limit,
        cursor,
        undefined,
        undefined,
        input.query,
        { signal }
      )
      return response.data
    },
  })
}

export interface LedgerSearchState<T> {
  readonly query: string
  readonly setQuery: (query: string) => void
  readonly results: readonly T[]
  readonly total: number | null
  readonly pending: boolean
  readonly hasMore: boolean
  readonly loadMore: () => void
}

function lookupOf(
  pages: readonly {
    lookup_tables?: Parameters<typeof toLookupIndex>[0]
  }[]
): LookupIndex {
  const tables = pages
    .map((page) => page.lookup_tables)
    .filter(
      (table): table is Parameters<typeof toLookupIndex>[0] =>
        table !== undefined
    )
  if (tables.length === 0) return EMPTY_LOOKUP
  return mergeLookupIndexes(tables.map((table) => toLookupIndex(table)))
}

/**
 * Every keystroke would be a request without the debounce, and the picker has to search the
 * server because the ledger only ever holds the pages already loaded.
 */
export function useGroupSearch(
  userId: UserId,
  options: { enabled?: boolean; delay?: number } = {}
): LedgerSearchState<LedgerGroupRow> {
  const [query, setQuery] = useState("")
  const settled = useDebouncedValue(
    query,
    options.delay ?? GROUP_SEARCH_DEBOUNCE_MS
  ).trim()
  const enabled = options.enabled ?? true

  const search = useInfiniteQuery({
    ...transactionGroupsInfiniteQueryOptions({
      userId,
      query: settled === "" ? undefined : settled,
    }),
    enabled,
  })

  const results = useMemo(() => {
    const pages = search.data?.pages ?? []
    const lookup = lookupOf(pages)
    return pages
      .flatMap((page) => page.results ?? [])
      .map((group) =>
        toGroupRow(
          { item_type: "group", ...group } as GroupTransactionItem,
          lookup
        )
      )
  }, [search.data])

  return {
    query,
    setQuery,
    results,
    total: search.data?.pages[0]?.total_results ?? null,
    pending: search.isFetching || query.trim() !== settled,
    hasMore: search.hasNextPage,
    loadMore: () => {
      if (!search.hasNextPage || search.isFetchingNextPage) return
      void search.fetchNextPage()
    },
  }
}

/**
 * Only ungrouped transactions can join a group — the server moves them out of "individual",
 * and one already in a group has to leave it first — so the picker searches that listing
 * rather than the combined ledger.
 */
export function useUngroupedSearch(
  userId: UserId,
  options: { enabled?: boolean; delay?: number } = {}
): LedgerSearchState<LedgerTransactionRow> {
  const [query, setQuery] = useState("")
  const settled = useDebouncedValue(
    query,
    options.delay ?? GROUP_SEARCH_DEBOUNCE_MS
  ).trim()
  const enabled = options.enabled ?? true

  const search = useInfiniteQuery({
    ...individualLedgerInfiniteQueryOptions({
      userId,
      query: settled === "" ? undefined : settled,
      limit: SEARCH_PAGE_SIZE,
    }),
    enabled,
  })

  const results = useMemo(() => {
    const pages = search.data?.pages ?? []
    const lookup = lookupOf(pages)
    return pages
      .flatMap((page) => page.results ?? [])
      .map((transaction) => toTransactionRow(transaction, lookup))
  }, [search.data])

  return {
    query,
    setQuery,
    results,
    total: null,
    pending: search.isFetching || query.trim() !== settled,
    hasMore: search.hasNextPage,
    loadMore: () => {
      if (!search.hasNextPage || search.isFetchingNextPage) return
      void search.fetchNextPage()
    },
  }
}
