import type { PortfolioRange } from "@/lib/query"

export type ChartPeriod = PortfolioRange

export const CHART_PERIODS = [
  "1d",
  "1w",
  "1m",
  "3m",
  "6m",
  "1y",
  "all",
] as const satisfies readonly ChartPeriod[]

export const DEFAULT_CHART_PERIOD: ChartPeriod = "1m"

export const CHART_PERIOD_LABELS: Record<ChartPeriod, string> = {
  "1d": "1D",
  "1w": "1W",
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  all: "ALL",
}

export const CHART_PERIOD_TITLES: Record<ChartPeriod, string> = {
  "1d": "Last 24 hours",
  "1w": "Last week",
  "1m": "Last month",
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "1y": "Last year",
  all: "All time",
}

export function isChartPeriod(value: unknown): value is ChartPeriod {
  return (
    typeof value === "string" &&
    (CHART_PERIODS as readonly string[]).includes(value)
  )
}
