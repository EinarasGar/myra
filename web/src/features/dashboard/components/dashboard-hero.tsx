import { useState } from "react"

import type { ChartPeriod } from "@/components/chart"
import { HeroChart, HeroChartSkeleton } from "@/components/chart"
import { Figure } from "@/components/figure"
import { focusRing, HIT_TARGET_ROW } from "@/components/primitives"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { HistorySeries } from "@/features/portfolio/api"
import { historyChartPoints } from "@/features/portfolio/api"
import { MockBadge, mockMarkerProps } from "@/lib/mock"
import { cn } from "@/lib/utils"

import type { NetWorthAttribution } from "../api"
import { AttributionPanel } from "./attribution-panel"

export const NO_HISTORY_NOTE =
  "Not enough history yet — add transactions to see it grow"

export const CHART_EMPTY_LABEL =
  "Your net worth history appears here once you have a few days of data"

export interface DashboardHeroProps {
  greeting: string
  series: HistorySeries
  currency: string
  period: ChartPeriod
  onPeriodChange: (period: ChartPeriod) => void
  attribution: NetWorthAttribution | null
}

export function DashboardHero({
  greeting,
  series,
  currency,
  period,
  onPeriodChange,
  attribution,
}: DashboardHeroProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <HeroChart
        data={historyChartPoints(series)}
        currency={currency}
        label={greeting}
        period={period}
        onPeriodChange={onPeriodChange}
        emptyLabel={CHART_EMPTY_LABEL}
        summary={
          attribution === null ? (
            <p
              data-slot="hero-no-split"
              className="text-[13px] leading-[1.5] text-ink-3"
            >
              {NO_HISTORY_NOTE}
            </p>
          ) : (
            <div
              data-slot="hero-split"
              className="flex flex-wrap items-center gap-x-[9px] gap-y-2"
            >
              <p className="text-[13px] leading-[1.5] text-ink-2">
                <span data-slot="hero-split-scope">
                  Over the full {attribution.attribution.rangeLabel} window,{" "}
                  <Figure
                    value={attribution.attribution.total}
                    currency={currency}
                    intent="gainLoss"
                    sign="always"
                    className="text-[13px]"
                  />
                </span>{" "}
                &mdash;{" "}
                <span {...mockMarkerProps(attribution.mockId)}>
                  <Figure
                    value={attribution.attribution.split.savedAmount}
                    currency={currency}
                    intent="gainLoss"
                    sign="always"
                    className="text-[13px]"
                  />{" "}
                  {attribution.attribution.split.savedLabel},{" "}
                  <Figure
                    value={attribution.attribution.split.earnedAmount}
                    currency={currency}
                    intent="gainLoss"
                    sign="always"
                    className="text-[13px]"
                  />{" "}
                  {attribution.attribution.split.earnedLabel}.
                  <span className="sr-only">
                    {" "}
                    That split is invented; the window change it splits is not.
                  </span>
                </span>
              </p>
              <MockBadge id={attribution.mockId} />
              <CollapsibleTrigger
                className={cn(
                  "flex-none text-[11px] leading-none font-semibold whitespace-nowrap text-brand outline-none",
                  HIT_TARGET_ROW,
                  focusRing.chip
                )}
              >
                {open ? "Hide ▴" : "Why ▾"}
              </CollapsibleTrigger>
            </div>
          )
        }
      />
      {attribution === null ? null : (
        <CollapsibleContent className="mt-4">
          <AttributionPanel
            attribution={attribution.attribution}
            currency={currency}
            mockId={attribution.mockId}
          />
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

export function DashboardHeroSkeleton({
  period,
  onPeriodChange,
}: {
  period: ChartPeriod
  onPeriodChange: (period: ChartPeriod) => void
}) {
  return (
    <HeroChartSkeleton
      label="Loading net worth"
      period={period}
      onPeriodChange={onPeriodChange}
    />
  )
}
