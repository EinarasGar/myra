import { useShellWidth } from "@/components/layout/breakpoints"
import { SkeletonBar } from "@/components/states/loading-state"
import { cn } from "@/lib/utils"

import { heroChartHeight, type HeroChartSize } from "./heights"
import { PeriodSelector } from "./period-selector"
import { CHART_PERIODS, type ChartPeriod } from "./periods"

export interface HeroChartSkeletonProps {
  size?: HeroChartSize
  label?: string
  period?: ChartPeriod
  periods?: readonly ChartPeriod[]
  onPeriodChange?: (period: ChartPeriod) => void
  periodLabel?: string
  className?: string
}

export function HeroChartSkeleton({
  size = "default",
  label = "Loading chart",
  period,
  periods = CHART_PERIODS,
  onPeriodChange,
  periodLabel,
  className,
}: HeroChartSkeletonProps) {
  const width = useShellWidth()
  const height = heroChartHeight(size, width)
  const showPeriods = period !== undefined && onPeriodChange !== undefined

  return (
    <section
      data-slot="hero-chart-skeleton"
      aria-busy
      className={cn("flex flex-col", className)}
    >
      <span role="status" className="sr-only">
        {label}
      </span>
      <div
        data-slot="hero-chart-skeleton-header"
        className="flex items-end justify-between gap-6"
      >
        <SkeletonBar width={240} height={44} anchor />
        {showPeriods ? (
          <PeriodSelector
            value={period}
            periods={periods}
            onValueChange={onPeriodChange}
            label={periodLabel}
            className="flex-none pb-[7px]"
          />
        ) : null}
      </div>
      <SkeletonBar width="100%" height={height} className="mt-5" />
      <SkeletonBar width={180} height={10} className="mt-[10px]" />
    </section>
  )
}
