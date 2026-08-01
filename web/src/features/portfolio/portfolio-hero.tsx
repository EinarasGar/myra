import { useBaseCurrency, useUserId } from "@/auth"
import type { ChartPeriod } from "@/components/chart"
import { HeroChart, HeroChartSkeleton } from "@/components/chart"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import {
  historyChartPoints,
  useRequiredBaseAssetId,
  usePortfolioHistorySuspense,
} from "@/features/portfolio/api"

const CHART_EMPTY_LABEL =
  "Your portfolio history appears here once there are a few days of valuations"

function PortfolioHeroChart({
  period,
  onPeriodChange,
}: {
  period: ChartPeriod
  onPeriodChange: (next: ChartPeriod) => void
}) {
  const userId = useUserId()
  const defaultAssetId = useRequiredBaseAssetId()
  const baseCurrency = useBaseCurrency()
  const series = usePortfolioHistorySuspense({
    userId,
    defaultAssetId,
    range: period,
  })

  return (
    <HeroChart
      data={historyChartPoints(series)}
      currency={baseCurrency}
      label="Portfolio value"
      size="tall"
      period={period}
      onPeriodChange={onPeriodChange}
      emptyLabel={CHART_EMPTY_LABEL}
    />
  )
}

export function PortfolioHero({
  period,
  onPeriodChange,
}: {
  period: ChartPeriod
  onPeriodChange: (next: ChartPeriod) => void
}) {
  return (
    <PanelBoundary
      pending={
        <HeroChartSkeleton
          size="tall"
          label="Loading portfolio history"
          period={period}
          onPeriodChange={onPeriodChange}
        />
      }
    >
      <PortfolioHeroChart period={period} onPeriodChange={onPeriodChange} />
    </PanelBoundary>
  )
}
