import { useMemo } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"

import { useBaseCurrency } from "@/auth"
import type { ChartMarker, ChartPeriod, ChartPoint } from "@/components/chart"
import { HeroChart, HeroChartSkeleton } from "@/components/chart"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { assetConvertedRatesQueryOptions } from "@/features/assets/api"
import type { AssetHolding } from "@/features/portfolio/api"
import { useRequiredBaseAssetId } from "@/features/portfolio/api"
import { formatMoney } from "@/lib/format"

const CHART_EMPTY_LABEL =
  "No price history for this window — Sverto has no rates for this pair"

function markerNote(lotCount: number, hasAverage: boolean): string {
  const lots = lotCount === 1 ? "purchase lot" : "purchase lots"
  const average = hasAverage
    ? ", and the dashed line is your average cost across every account"
    : ""
  return `The rings are your ${String(lotCount)} ${lots}, drawn at the unit price you paid${average}.`
}

function AssetHeroChart({
  assetId,
  holding,
  period,
  onPeriodChange,
}: {
  assetId: number
  holding: AssetHolding
  period: ChartPeriod
  onPeriodChange: (next: ChartPeriod) => void
}) {
  const defaultAssetId = useRequiredBaseAssetId()
  const baseCurrency = useBaseCurrency()
  const { data: rates } = useSuspenseQuery(
    assetConvertedRatesQueryOptions(assetId, defaultAssetId, period)
  )

  const points = useMemo<ChartPoint[]>(
    () => rates.map((point) => ({ date: point.date, value: point.rate })),
    [rates]
  )
  const markers = useMemo<ChartMarker[]>(
    () =>
      holding.lots.map((lot) => ({
        date: lot.addedAt,
        value: lot.addPrice,
      })),
    [holding.lots]
  )

  const average = holding.averageUnitCost

  return (
    <HeroChart
      data={points}
      currency={baseCurrency}
      label="Unit price"
      size="tall"
      period={period}
      onPeriodChange={onPeriodChange}
      markers={markers}
      emptyLabel={CHART_EMPTY_LABEL}
      {...(average === null
        ? {}
        : {
            referenceLine: {
              value: average,
              label: `avg cost ${formatMoney(average, { currency: baseCurrency })}`,
            },
          })}
      footer={
        <p className="text-[11px] leading-[1.4] text-pretty text-ink-3">
          {markerNote(holding.lots.length, average !== null)}
        </p>
      }
    />
  )
}

export function AssetHero({
  assetId,
  holding,
  period,
  onPeriodChange,
}: {
  assetId: number
  holding: AssetHolding
  period: ChartPeriod
  onPeriodChange: (next: ChartPeriod) => void
}) {
  return (
    <PanelBoundary
      pending={
        <HeroChartSkeleton
          size="tall"
          label="Loading the price line"
          period={period}
          onPeriodChange={onPeriodChange}
        />
      }
    >
      <AssetHeroChart
        assetId={assetId}
        holding={holding}
        period={period}
        onPeriodChange={onPeriodChange}
      />
    </PanelBoundary>
  )
}
