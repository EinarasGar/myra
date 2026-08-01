import type { InfiniteData, QueryKey } from "@tanstack/react-query"
import { infiniteQueryOptions, keepPreviousData } from "@tanstack/react-query"

import { STALE_TIMES } from "./client"
import type { SvertoQueryMeta } from "./error-reporter"
import { withNormalizedErrors } from "./queries"

export interface CursorPage<TResult> {
  results: TResult[]
  has_more: boolean
  next_cursor?: string | null
  total_results?: number | null
}

export interface OffsetPage<TResult> {
  results: TResult[]
  total_results: number
}

interface CursorPageContext {
  cursor: string | undefined
  signal: AbortSignal
}

interface OffsetPageContext {
  start: number
  signal: AbortSignal
}

interface SharedConfig<TKey extends QueryKey> {
  queryKey: TKey
  staleTime?: number
  meta?: SvertoQueryMeta
  /**
   * Holds the pages loaded under the PREVIOUS key on screen until the new ones land,
   * instead of dropping to a skeleton. Only turn it on where the surface tells the
   * reader what it is now showing and marks the rows busy while they are behind —
   * otherwise the old rows silently pass for an answer to the new question.
   */
  keepPreviousPage?: boolean
}

function placeholder(config: { keepPreviousPage?: boolean }) {
  return config.keepPreviousPage === true
    ? { placeholderData: keepPreviousData }
    : {}
}

export interface CursorInfiniteConfig<
  TPage,
  TKey extends QueryKey,
> extends SharedConfig<TKey> {
  fetchPage: (context: CursorPageContext) => Promise<TPage>
}

export interface OffsetInfiniteConfig<
  TPage,
  TKey extends QueryKey,
> extends SharedConfig<TKey> {
  fetchPage: (context: OffsetPageContext) => Promise<TPage>
}

export function cursorInfiniteQueryOptions<
  TPage extends CursorPage<unknown>,
  TKey extends QueryKey,
>(config: CursorInfiniteConfig<TPage, TKey>) {
  return infiniteQueryOptions({
    queryKey: config.queryKey,
    queryFn: ({ pageParam, signal }) =>
      withNormalizedErrors(() =>
        config.fetchPage({ cursor: pageParam, signal })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: TPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
    ...placeholder(config),
    staleTime: config.staleTime ?? STALE_TIMES.short,
    ...(config.meta === undefined ? {} : { meta: config.meta }),
  })
}

export function offsetInfiniteQueryOptions<
  TPage extends OffsetPage<unknown>,
  TKey extends QueryKey,
>(config: OffsetInfiniteConfig<TPage, TKey>) {
  return infiniteQueryOptions({
    queryKey: config.queryKey,
    queryFn: ({ pageParam, signal }) =>
      withNormalizedErrors(() =>
        config.fetchPage({ start: pageParam, signal })
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage: TPage, allPages: TPage[]) => {
      if (lastPage.results.length === 0) return undefined
      const loaded = allPages.reduce(
        (total, page) => total + page.results.length,
        0
      )
      return loaded < lastPage.total_results ? loaded : undefined
    },
    ...placeholder(config),
    staleTime: config.staleTime ?? STALE_TIMES.short,
    ...(config.meta === undefined ? {} : { meta: config.meta }),
  })
}

export function flattenPages<TResult>(
  data: InfiniteData<{ results: TResult[] }> | undefined
): TResult[] {
  if (data === undefined) return []
  return data.pages.flatMap((page) => page.results)
}

export function totalResultsOf(
  data: InfiniteData<{ total_results?: number | null }> | undefined
): number | undefined {
  if (data === undefined) return undefined
  for (const page of data.pages) {
    if (typeof page.total_results === "number") return page.total_results
  }
  return undefined
}
