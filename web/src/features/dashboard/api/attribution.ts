import { useMemo } from "react"

import type { HistorySeries } from "@/features/portfolio/api"
import { attributionRangeLabel } from "@/features/portfolio/attribution"
import type { MockId } from "@/lib/mock"
import type { MockAttribution } from "@/lib/mock"
import { mockNetWorthAttribution } from "@/lib/mock"

export const ATTRIBUTION_MOCK_ID: MockId = "dashboard.attribution"

export interface NetWorthAttribution {
  attribution: MockAttribution
  mockId: MockId
}

/**
 * Scaled from the real window delta so the two subtotals still add up to the figure
 * printed beside the hero. A breakdown that disagrees with its own header is worse
 * than no breakdown.
 */
export function useNetWorthAttribution(
  series: HistorySeries,
  locale?: string
): NetWorthAttribution | null {
  return useMemo(() => {
    if (series.change === null) return null
    const rangeLabel = attributionRangeLabel(series, locale)
    return {
      attribution: mockNetWorthAttribution({
        total: series.change,
        ...(rangeLabel === null ? {} : { rangeLabel }),
      }),
      mockId: ATTRIBUTION_MOCK_ID,
    }
  }, [series, locale])
}
