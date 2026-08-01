import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import type {
  AccountTransactionsPage,
  CombinedTransactionsPage,
  GetIndividualTransaction,
  IndividualTransactionsPage,
} from "@/api"
import {
  AccountPortfolioApiFactory,
  IndividualTransactionsApiFactory,
  TransactionsApiFactory,
} from "@/api"
import { api, apiClient } from "@/lib/api"
import { normalizeError } from "@/lib/errors"
import type { AccountId, TransactionId, UserId } from "@/lib/query"
import {
  apiQueryOptions,
  cursorInfiniteQueryOptions,
  offsetInfiniteQueryOptions,
  queryKeys,
  STALE_TIMES,
  withNormalizedErrors,
} from "@/lib/query"

import type { LedgerFilterToken, LedgerQueryPlan } from "./filters"
import { planLedgerQuery } from "./filters"
import type { LookupIndex } from "./lookup"
import { mergeLookupIndexes, toLookupIndex } from "./lookup"
import { groupRowsByDay, toLedgerRows, toTransactionRows } from "./normalise"
import type { LedgerDay, LedgerRow } from "./types"

export const LEDGER_PAGE_SIZE = 25

export interface LedgerQueryInput {
  readonly userId: UserId
  readonly tokens?: readonly LedgerFilterToken[]
  readonly limit?: number
  /** Only for a surface that marks `isPlaceholder` — see `keepPreviousPage`. */
  readonly keepPreviousPage?: boolean
}

export function combinedLedgerInfiniteQueryOptions(input: {
  userId: UserId
  query: string | undefined
  limit?: number
  keepPreviousPage?: boolean
}) {
  const limit = input.limit ?? LEDGER_PAGE_SIZE
  return cursorInfiniteQueryOptions({
    ...(input.keepPreviousPage === undefined
      ? {}
      : { keepPreviousPage: input.keepPreviousPage }),
    queryKey: queryKeys
      .user(input.userId)
      .transactions.combined({ limit, query: input.query }),
    fetchPage: async ({
      cursor,
      signal,
    }): Promise<CombinedTransactionsPage> => {
      const response = await api(TransactionsApiFactory).getTransactions(
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

export function individualLedgerInfiniteQueryOptions(input: {
  userId: UserId
  query: string | undefined
  limit?: number
}) {
  const limit = input.limit ?? LEDGER_PAGE_SIZE
  return cursorInfiniteQueryOptions({
    queryKey: queryKeys
      .user(input.userId)
      .transactions.individual.list({ limit, query: input.query }),
    fetchPage: async ({
      cursor,
      signal,
    }): Promise<IndividualTransactionsPage> => {
      const response = await api(
        IndividualTransactionsApiFactory
      ).getIndividualTransactions(
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

const EMPTY_ACCOUNT_PAGE: AccountTransactionsPage = {
  lookup_tables: { accounts: [], assets: [] },
  results: [],
  total_results: 0,
}

/**
 * The per-account handler answers an account that holds nothing with a 500 carrying "No
 * results found" rather than an empty page, and an account with no transactions is a normal
 * state, not a failure — so that one shape is read as the empty page the server should send.
 */
function isNoResultsError(error: unknown): boolean {
  const normalized = normalizeError(error)
  return (
    normalized.kind === "serverError" &&
    normalized.stackTrace === "No results found"
  )
}

/**
 * No `query`: the per-account handler binds a `query` param it never passes to the search
 * clause, so accepting one here would advertise a filter the server discards.
 */
export function accountLedgerInfiniteQueryOptions(input: {
  userId: UserId
  accountId: AccountId
  count?: number
  keepPreviousPage?: boolean
}) {
  const count = input.count ?? LEDGER_PAGE_SIZE
  return offsetInfiniteQueryOptions({
    ...(input.keepPreviousPage === undefined
      ? {}
      : { keepPreviousPage: input.keepPreviousPage }),
    queryKey: queryKeys
      .user(input.userId)
      .accounts.transactions(input.accountId, { count }),
    fetchPage: async ({ start, signal }): Promise<AccountTransactionsPage> => {
      try {
        const response = await api(
          AccountPortfolioApiFactory
        ).getAccountTransactions(
          input.userId,
          input.accountId,
          count,
          start,
          undefined,
          { signal }
        )
        return response.data
      } catch (error) {
        if (isNoResultsError(error)) return EMPTY_ACCOUNT_PAGE
        throw error
      }
    },
  })
}

/**
 * The generated `getSingle` never substitutes `{transaction_id}` into its path — the
 * server's utoipa annotation omits the parameter — so this one endpoint is called by hand
 * against the same axios instance until the spec is fixed.
 */
export function transactionDetailQueryOptions(input: {
  userId: UserId
  transactionId: TransactionId
}) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(input.userId)
      .transactions.individual.detail(input.transactionId),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }) => {
      const response = await apiClient.get<GetIndividualTransaction>(
        `/api/users/${encodeURIComponent(input.userId)}/transactions/individual/${encodeURIComponent(input.transactionId)}`,
        { signal }
      )
      return response.data
    },
  })
}

export interface LedgerResult {
  readonly rows: readonly LedgerRow[]
  readonly days: readonly LedgerDay[]
  readonly lookup: LookupIndex
  readonly plan: LedgerQueryPlan
  readonly source: "combined" | "account"
  readonly loadedCount: number
  readonly unreviewedLoadedCount: number
  /**
   * Read from page 0 only. The server's `count(*) OVER ()` sits behind the cursor
   * predicate, so later pages report the rows still ahead of the cursor, not the total.
   */
  readonly totalResults: number | undefined
  readonly isEmpty: boolean
  readonly isEmptyBecauseFiltered: boolean
  readonly isPending: boolean
  /**
   * These rows answer the PREVIOUS query — a filter changed and its page has not
   * landed. Anything rendering them owes the reader a busy state, because they do
   * not yet match what the query bar says.
   */
  readonly isPlaceholder: boolean
  readonly isError: boolean
  readonly error: unknown
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly isFetching: boolean
  readonly fetchNextPage: () => void
  readonly refetch: () => void
}

export function useLedger(input: LedgerQueryInput): LedgerResult {
  const plan = useMemo(
    () => planLedgerQuery(input.tokens ?? []),
    [input.tokens]
  )
  const isAccountScoped = plan.accountId !== null

  const combined = useInfiniteQuery({
    ...combinedLedgerInfiniteQueryOptions({
      userId: input.userId,
      query: plan.query,
      limit: input.limit,
      keepPreviousPage: input.keepPreviousPage === true,
    }),
    enabled: !isAccountScoped,
  })

  const scoped = useInfiniteQuery({
    ...accountLedgerInfiniteQueryOptions({
      userId: input.userId,
      accountId: plan.accountId ?? "",
      count: input.limit,
      keepPreviousPage: input.keepPreviousPage === true,
    }),
    enabled: isAccountScoped,
  })

  const active = isAccountScoped ? scoped : combined

  const { rows, lookup, totalResults } = useMemo(() => {
    if (isAccountScoped) {
      const pages = scoped.data?.pages ?? []
      const merged = mergeLookupIndexes(
        pages.map((page) => toLookupIndex(page.lookup_tables))
      )
      return {
        lookup: merged,
        rows: toTransactionRows(
          pages.flatMap((page) => page.results),
          merged
        ),
        totalResults: pages[0]?.total_results,
      }
    }

    const pages = combined.data?.pages ?? []
    const merged = mergeLookupIndexes(
      pages.map((page) => toLookupIndex(page.lookup_tables))
    )
    return {
      lookup: merged,
      rows: toLedgerRows(
        pages.flatMap((page) => page.results),
        merged
      ),
      totalResults: pages[0]?.total_results ?? undefined,
    }
  }, [combined.data, scoped.data, isAccountScoped])

  const days = useMemo(() => groupRowsByDay(rows), [rows])
  const unreviewedLoadedCount = useMemo(
    () => rows.filter((row) => row.isUnreviewed).length,
    [rows]
  )

  const isEmpty = !active.isPending && rows.length === 0

  return {
    rows,
    days,
    lookup,
    plan,
    source: plan.source,
    loadedCount: rows.length,
    unreviewedLoadedCount,
    totalResults: totalResults ?? undefined,
    isEmpty,
    isEmptyBecauseFiltered: isEmpty && plan.isFiltered,
    isPending: active.isPending,
    isPlaceholder: active.isPlaceholderData,
    isError: active.isError,
    error: active.error,
    hasNextPage: active.hasNextPage,
    isFetchingNextPage: active.isFetchingNextPage,
    isFetching: active.isFetching,
    fetchNextPage: () => {
      void active.fetchNextPage()
    },
    refetch: () => {
      void active.refetch()
    },
  }
}

export interface TransactionDetail {
  readonly lookup: LookupIndex
  readonly raw: GetIndividualTransaction
}

export function useTransactionDetail(input: {
  userId: UserId
  transactionId: TransactionId
  enabled?: boolean
}) {
  const query = useQuery({
    ...transactionDetailQueryOptions(input),
    ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
  })

  const detail = useMemo<TransactionDetail | undefined>(() => {
    if (query.data === undefined) return undefined
    return {
      lookup: toLookupIndex(query.data.lookup_tables),
      raw: query.data,
    }
  }, [query.data])

  return {
    detail,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: () => {
      void query.refetch()
    },
  }
}

export async function fetchLedgerPage(input: {
  userId: UserId
  query: string | undefined
  limit?: number
  cursor?: string
  signal?: AbortSignal
}): Promise<CombinedTransactionsPage> {
  return withNormalizedErrors(async () => {
    const response = await api(TransactionsApiFactory).getTransactions(
      input.userId,
      input.limit ?? LEDGER_PAGE_SIZE,
      input.cursor,
      undefined,
      undefined,
      input.query,
      input.signal === undefined ? {} : { signal: input.signal }
    )
    return response.data
  })
}
