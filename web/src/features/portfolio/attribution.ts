import { useMemo } from "react"

import type { HistorySeries } from "@/features/portfolio/api"
import { formatDateStamp } from "@/lib/format"
import type { MockId, MockPortfolioAttribution } from "@/lib/mock"
import { mockPortfolioAttribution } from "@/lib/mock"

export const WHY_IT_MOVED_MOCK_ID: MockId = "portfolio.why-it-moved"

export interface PortfolioAttribution {
  attribution: MockPortfolioAttribution
  mockId: MockId
}

export function attributionRangeLabel(
  series: HistorySeries,
  locale?: string
): string | null {
  const first = series.points[0]
  const last = series.points[series.points.length - 1]
  if (!first || !last) return null
  const options = locale === undefined ? {} : { locale }
  return `${formatDateStamp(first.timestamp, options)} – ${formatDateStamp(
    last.timestamp,
    { ...options, year: "always" }
  )}`
}

/**
 * Anchored to the real window change so the invented split can only ever redistribute
 * a figure the header already prints. Feeding it anything else lets the breakdown
 * contradict the chart it sits under.
 */
export function usePortfolioAttribution(
  series: HistorySeries,
  locale?: string
): PortfolioAttribution | null {
  return useMemo(() => {
    if (series.change === null) return null
    const rangeLabel = attributionRangeLabel(series, locale)
    return {
      attribution: mockPortfolioAttribution({
        total: series.change,
        ...(rangeLabel === null ? {} : { rangeLabel }),
      }),
      mockId: WHY_IT_MOVED_MOCK_ID,
    }
  }, [series, locale])
}

export function attributionMarket(
  attribution: PortfolioAttribution | null
): number | null {
  if (attribution === null) return null
  return (
    attribution.attribution.buckets.find((bucket) => bucket.key === "market")
      ?.amount ?? null
  )
}
