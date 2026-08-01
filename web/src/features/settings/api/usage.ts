import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import type { AiUsageMetric, AiUsageResponse, AiUsageWindow } from "@/api"
import { AIApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { UserId } from "@/lib/query"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

export const QUOTA_ATTENTION_RATIO = 0.65

export const QUOTA_CRITICAL_RATIO = 0.9

export type UsageWindowId = "hourly" | "monthly"

export interface UsageMetricView {
  readonly used: number
  readonly limit: number
  /** `null` when the server reports no limit, so nothing is drawn as a share of zero. */
  readonly ratio: number | null
}

export interface UsageWindowView {
  readonly id: UsageWindowId
  readonly label: string
  /** Epoch MILLISECONDS. `null` when the server sent an unparseable stamp. */
  readonly resetAt: number | null
  readonly input: UsageMetricView
  readonly output: UsageMetricView
  readonly peakRatio: number | null
}

export interface AiUsageView {
  readonly windows: readonly UsageWindowView[]
  readonly peakRatio: number | null
}

function toMetric(metric: AiUsageMetric): UsageMetricView {
  return {
    used: metric.used,
    limit: metric.limit,
    ratio: metric.limit > 0 ? metric.used / metric.limit : null,
  }
}

function peakOf(ratios: readonly (number | null)[]): number | null {
  const known = ratios.filter((ratio): ratio is number => ratio !== null)
  return known.length === 0 ? null : Math.max(...known)
}

function toWindow(
  id: UsageWindowId,
  label: string,
  window: AiUsageWindow
): UsageWindowView {
  const parsed = Date.parse(window.reset_at)
  const input = toMetric(window.input)
  const output = toMetric(window.output)
  return {
    id,
    label,
    resetAt: Number.isNaN(parsed) ? null : parsed,
    input,
    output,
    peakRatio: peakOf([input.ratio, output.ratio]),
  }
}

export function buildAiUsage(response: AiUsageResponse): AiUsageView {
  const windows = [
    toWindow("hourly", "Hourly", response.hourly),
    toWindow("monthly", "Monthly", response.monthly),
  ]
  return { windows, peakRatio: peakOf(windows.map((w) => w.peakRatio)) }
}

export function quotaTone(
  ratio: number | null
): "brand" | "attention" | "negative" {
  if (ratio === null) return "brand"
  if (ratio >= QUOTA_CRITICAL_RATIO) return "negative"
  return ratio >= QUOTA_ATTENTION_RATIO ? "attention" : "brand"
}

export function aiUsageQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).ai.usage(),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<AiUsageView> => {
      const response = await api(AIApiFactory).getUsage(userId, { signal })
      return buildAiUsage(response.data)
    },
    meta: { errorContext: "Myra usage could not be loaded" },
  })
}

export function useAiUsage(userId: UserId) {
  return useQuery(aiUsageQueryOptions(userId))
}

export function useAiUsageSuspense(userId: UserId): AiUsageView {
  return useSuspenseQuery(aiUsageQueryOptions(userId)).data
}
