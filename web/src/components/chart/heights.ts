import type { ShellWidth } from "@/components/layout/breakpoints"

export type HeroChartSize = "default" | "tall" | "compact"

export const HERO_CHART_FULL_HEIGHTS: Record<HeroChartSize, number> = {
  default: 164,
  tall: 180,
  compact: 140,
}

export const HERO_CHART_HEIGHT_LADDER: Record<
  Exclude<ShellWidth, "full">,
  number
> = {
  tight: 150,
  stacked: 130,
  phone: 104,
}

export function heroChartHeight(
  size: HeroChartSize,
  width: ShellWidth
): number {
  if (width === "full") return HERO_CHART_FULL_HEIGHTS[size]
  return Math.min(
    HERO_CHART_HEIGHT_LADDER[width],
    HERO_CHART_FULL_HEIGHTS[size]
  )
}
