import { useMemo, type ReactNode } from "react"

import { Figure } from "@/components/figure"
import { cn } from "@/lib/utils"

import { SeriesSwatch } from "./series-swatch"
import {
  collapseToTop,
  SERIES_COLOR_COUNT,
  SERIES_OVERFLOW_KEY,
  type SeriesColors,
} from "./series-colors"

export interface AllocationSegment {
  key: string
  label: ReactNode
  value: number
  color?: string
}

export interface AllocationBarProps {
  segments: readonly AllocationSegment[]
  colors: SeriesColors
  limit?: number
  otherLabel?: string
  height?: number
  legend?: boolean
  label: string
  locale?: string
  className?: string
}

export function AllocationBar({
  segments,
  colors,
  limit = SERIES_COLOR_COUNT,
  otherLabel = "Other",
  height = 10,
  legend = true,
  label,
  locale,
  className,
}: AllocationBarProps) {
  const visible = useMemo(
    () =>
      collapseToTop(
        segments.filter((segment) => segment.value > 0),
        {
          weightOf: (segment) => segment.value,
          limit,
          merge: (tail, value) => ({
            key: SERIES_OVERFLOW_KEY,
            label: `${otherLabel} (${tail.length})`,
            value,
          }),
        }
      ),
    [segments, limit, otherLabel]
  )

  const total = visible.reduce((sum, segment) => sum + segment.value, 0)
  if (visible.length === 0 || total <= 0) return null

  const laid = visible.map((segment, index) => {
    const before = visible
      .slice(0, index)
      .reduce((sum, earlier) => sum + earlier.value, 0)
    const share = segment.value / total
    return {
      ...segment,
      share,
      x: (before / total) * 1000,
      width: share * 1000,
      color: segment.color ?? colors.colorFor(segment.key),
    }
  })

  return (
    <div data-slot="allocation-bar" className={cn("w-full", className)}>
      <svg
        viewBox="0 0 1000 10"
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        style={{ height }}
        className="block w-full"
      >
        {laid.map((segment) => (
          <rect
            key={segment.key}
            x={segment.x}
            y="0"
            width={segment.width}
            height="10"
            fill={segment.color}
          />
        ))}
      </svg>
      {legend ? (
        <ul
          data-slot="allocation-legend"
          className="mt-[13px] flex list-none flex-wrap gap-x-5 gap-y-2"
        >
          {laid.map((segment) => (
            <li
              key={segment.key}
              className="flex items-center gap-[7px] whitespace-nowrap"
            >
              <SeriesSwatch color={segment.color} />
              <span className="text-[11.5px] leading-none font-medium">
                {segment.label}
              </span>
              <Figure
                value={segment.share}
                kind="percent"
                scale="ratio"
                intent="meta"
                size="micro"
                locale={locale}
                className="text-[11.5px]"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
