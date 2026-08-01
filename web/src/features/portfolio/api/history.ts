import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import type { GetNetWorthHistoryResponse } from "@/api"
import { AccountPortfolioApiFactory, PortfolioApiFactory } from "@/api"
import type { ChartPoint } from "@/components/chart"
import { api } from "@/lib/api"
import type { PortfolioRange } from "@/lib/query"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

export interface HistoryPoint {
  /** Epoch MILLISECONDS. The API sends unix seconds; normalised once, here. */
  timestamp: number
  value: number
}

export interface HistorySeries {
  range: PortfolioRange
  points: HistoryPoint[]
  first: number | null
  last: number | null
  min: number | null
  max: number | null
  /** `last − first`. The hero delta; there is no dedicated endpoint for it. */
  change: number | null
  /** Fraction, not percent. `null` when the window opens at zero. */
  changeRatio: number | null
  isEmpty: boolean
}

const EMPTY_SERIES_TOTALS = {
  first: null,
  last: null,
  min: null,
  max: null,
  change: null,
  changeRatio: null,
} as const

export function buildHistorySeries(
  response: GetNetWorthHistoryResponse,
  range: PortfolioRange
): HistorySeries {
  const points: HistoryPoint[] = response.sums
    .map((point) => ({ timestamp: point.date * 1000, value: point.rate }))
    .sort((a, b) => a.timestamp - b.timestamp)

  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) {
    return { range, points, ...EMPTY_SERIES_TOTALS, isEmpty: true }
  }

  const values = points.map((point) => point.value)
  const change = last.value - first.value

  return {
    range,
    points,
    first: first.value,
    last: last.value,
    min: Math.min(...values),
    max: Math.max(...values),
    change,
    changeRatio: first.value === 0 ? null : change / first.value,
    isEmpty: false,
  }
}

export function historyChartPoints(series: HistorySeries): ChartPoint[] {
  return series.points.map((point) => ({
    date: point.timestamp,
    value: point.value,
  }))
}

export interface PortfolioHistoryQueryParams {
  userId: string
  defaultAssetId: number
  range: PortfolioRange
}

export function portfolioHistoryQueryOptions({
  userId,
  defaultAssetId,
  range,
}: PortfolioHistoryQueryParams) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).portfolio.history({
      defaultAssetId,
      range,
    }),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<HistorySeries> => {
      const response = await api(PortfolioApiFactory).getNetworthHistory(
        userId,
        range,
        defaultAssetId,
        { signal }
      )
      return buildHistorySeries(response.data, range)
    },
    meta: { errorContext: "Net worth history could not be loaded" },
  })
}

export function usePortfolioHistory(params: PortfolioHistoryQueryParams) {
  return useQuery(portfolioHistoryQueryOptions(params))
}

export function usePortfolioHistorySuspense(
  params: PortfolioHistoryQueryParams
): HistorySeries {
  return useSuspenseQuery(portfolioHistoryQueryOptions(params)).data
}

export interface AccountHistoryQueryParams extends PortfolioHistoryQueryParams {
  accountId: string
}

export function accountPortfolioHistoryQueryOptions({
  userId,
  accountId,
  defaultAssetId,
  range,
}: AccountHistoryQueryParams) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(userId)
      .accounts.portfolioHistory(accountId, { defaultAssetId, range }),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<HistorySeries> => {
      const response = await api(
        AccountPortfolioApiFactory
      ).getAccountNetworthHistory(userId, accountId, range, defaultAssetId, {
        signal,
      })
      return buildHistorySeries(response.data, range)
    },
    meta: { errorContext: "Account history could not be loaded" },
  })
}

export function useAccountPortfolioHistory(params: AccountHistoryQueryParams) {
  return useQuery(accountPortfolioHistoryQueryOptions(params))
}

export function useAccountPortfolioHistorySuspense(
  params: AccountHistoryQueryParams
): HistorySeries {
  return useSuspenseQuery(accountPortfolioHistoryQueryOptions(params)).data
}
