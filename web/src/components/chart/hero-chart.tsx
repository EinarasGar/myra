import {
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react"
import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { Figure } from "@/components/figure"
import { useShellWidth } from "@/components/layout/breakpoints"
import { FOCUS_RING_INSET } from "@/components/primitives"
import { ChartContainer } from "@/components/ui/chart"
import { countOf, formatMoney, toDate, type DateInput } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  axisTicks,
  baseValueFor,
  chartDelta,
  hasPlottableSeries,
  indexAtRatio,
  pointStamp,
  resolvePoints,
  spanInDays,
  valueOffsetRatio,
  yDomainFor,
  type ChartPoint,
  type ChartShape,
} from "./chart-data"
import { heroChartHeight, type HeroChartSize } from "./heights"
import { PeriodSelector } from "./period-selector"
import { CHART_PERIODS, type ChartPeriod } from "./periods"
import { useDrawIn } from "./use-draw-in"

export interface ChartMarker {
  date: DateInput
  value: number
  label?: string
}

export interface ChartReferenceLine {
  value: number
  label?: string
}

export type HeroChartKind = "money" | "rate" | "plain"

interface HeroChartBaseProps {
  data: readonly ChartPoint[]
  label?: ReactNode
  value?: number | null
  shape?: ChartShape
  size?: HeroChartSize
  period?: ChartPeriod
  periods?: readonly ChartPeriod[]
  onPeriodChange?: (period: ChartPeriod) => void
  periodLabel?: string
  note?: ReactNode
  summary?: ReactNode
  footer?: ReactNode
  degraded?: ReactNode
  markers?: readonly ChartMarker[]
  referenceLine?: ChartReferenceLine
  emptyLabel?: string
  scrubLabel?: string
  axisTickCount?: number
  locale?: string
  className?: string
}

type HeroChartCurrencyProps =
  | { kind?: "money"; currency: string }
  | { kind: Exclude<HeroChartKind, "money">; currency?: never }

export type HeroChartProps = HeroChartBaseProps & HeroChartCurrencyProps

const PLOT_MARGIN = { top: 2, right: 0, bottom: 0, left: 0 } as const

export function HeroChart({
  data,
  label,
  value,
  currency,
  kind = "money",
  shape = "asset",
  size = "default",
  period,
  periods = CHART_PERIODS,
  onPeriodChange,
  periodLabel,
  note,
  summary,
  footer,
  degraded,
  markers,
  referenceLine,
  emptyLabel = "No history for this period yet",
  scrubLabel = "Scrub the chart",
  axisTickCount = 5,
  locale,
  className,
}: HeroChartProps) {
  const width = useShellWidth()
  const height = heroChartHeight(size, width)

  const points = useMemo(() => resolvePoints(data), [data])
  const plottable = hasPlottableSeries(points)
  const domain = useMemo(() => yDomainFor(points, shape), [points, shape])
  const ticks = useMemo(
    () => axisTicks(points, axisTickCount, locale),
    [points, axisTickCount, locale]
  )

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const scrubbing = activeIndex !== null && activeIndex < points.length
  const activePoint = scrubbing ? points[activeIndex] : undefined

  const drawn = useDrawIn(plottable)

  const delta = useMemo(
    () => chartDelta(points, scrubbing ? activeIndex : undefined),
    [points, scrubbing, activeIndex]
  )

  const lastValue = useMemo(
    () =>
      [...points].reverse().find((point) => point.value !== null)?.value ??
      null,
    [points]
  )

  const headlineValue = scrubbing
    ? (activePoint?.value ?? null)
    : (value ?? lastValue)

  const moveTo = (next: number) => {
    setActiveIndex(Math.min(points.length - 1, Math.max(0, next)))
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const next = indexAtRatio(points, (event.clientX - rect.left) / rect.width)
    if (next !== null) setActiveIndex(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (points.length === 0) return
    const current = activeIndex ?? points.length - 1
    switch (event.key) {
      case "ArrowRight":
        moveTo(current + 1)
        break
      case "ArrowLeft":
        moveTo(current - 1)
        break
      case "Home":
        moveTo(0)
        break
      case "End":
        moveTo(points.length - 1)
        break
      case "Escape":
        setActiveIndex(null)
        break
      default:
        return
    }
    event.preventDefault()
  }

  const scrubValueText = () => {
    if (!activePoint) return undefined
    const stamp = pointStamp(points, activeIndex ?? 0, locale)
    if (activePoint.value === null) return stamp
    if (kind === "money" && currency) {
      return `${stamp}, ${formatMoney(activePoint.value, { currency, locale })}`
    }
    return stamp
  }

  const showPeriods = period !== undefined && onPeriodChange !== undefined

  return (
    <section
      data-slot="hero-chart"
      data-state={plottable ? "ready" : "empty"}
      data-shape={shape}
      data-scrubbing={scrubbing ? "true" : "false"}
      data-degraded={degraded ? "true" : "false"}
      className={cn("flex flex-col", className)}
    >
      <header
        data-slot="hero-chart-header"
        className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:flex-nowrap"
      >
        <div className="min-w-0">
          {label === undefined ? null : (
            <div
              data-slot="hero-chart-label"
              className="text-[10px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase"
            >
              {label}
            </div>
          )}
          <div
            className={cn(
              "flex flex-wrap items-end gap-x-4 gap-y-1 md:flex-nowrap",
              label === undefined ? undefined : "mt-[14px]"
            )}
          >
            <Figure
              data-slot="hero-chart-value"
              value={headlineValue}
              kind={kind}
              currency={currency}
              size="hero"
              locale={locale}
              className="flex-none"
            />
            <div
              data-slot="hero-chart-delta"
              className="flex min-h-[14px] items-baseline gap-[6px] pb-[7px] whitespace-nowrap"
            >
              <Figure
                value={delta?.change ?? null}
                kind={kind}
                currency={currency}
                intent="gainLoss"
                size="delta"
                locale={locale}
                arrow
              />
              <span
                data-slot="hero-chart-note"
                className="flex items-baseline gap-[5px] text-[13px] leading-none text-ink-2"
              >
                <span aria-hidden>·</span>
                {scrubbing ? (
                  <span className="font-mono text-[11.5px] leading-none">
                    {pointStamp(points, activeIndex ?? 0, locale)}
                  </span>
                ) : (
                  (note ?? (
                    <>
                      <Figure
                        value={delta === null ? null : delta.ratio}
                        kind="percent"
                        scale="ratio"
                        intent="secondary"
                        sign="always"
                        size="base"
                        locale={locale}
                      />
                      <span>{periodNote(spanInDays(points))}</span>
                    </>
                  ))
                )}
              </span>
            </div>
          </div>
          {summary === undefined ? null : (
            <div data-slot="hero-chart-summary" className="mt-[14px]">
              {summary}
            </div>
          )}
        </div>
        {showPeriods ? (
          <PeriodSelector
            value={period}
            periods={periods}
            onValueChange={onPeriodChange}
            label={periodLabel}
            className="flex-none pb-[7px]"
          />
        ) : null}
      </header>

      {plottable ? (
        <div
          data-slot="hero-chart-plot"
          className="relative mt-5"
          style={{ height }}
        >
          <div
            data-slot="hero-chart-draw"
            data-drawn={drawn ? "true" : "false"}
            className="h-full w-full transition-[clip-path] duration-sheet ease-out-quick"
            style={{ clipPath: drawn ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
          >
            <ChartContainer config={{}} className="aspect-auto h-full w-full">
              <AreaChart data={points} margin={PLOT_MARGIN}>
                <XAxis
                  type="number"
                  dataKey="t"
                  domain={["dataMin", "dataMax"]}
                  hide
                />
                <YAxis type="number" domain={domain} hide />
                <Area
                  dataKey="value"
                  type="monotone"
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  fill="var(--color-brand)"
                  fillOpacity={0.12}
                  baseValue={baseValueFor(domain, shape)}
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {referenceLine === undefined ? null : (
                  <ReferenceLine
                    y={referenceLine.value}
                    stroke="var(--color-ink-3)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                )}
                {(markers ?? []).map((marker) => {
                  const at = toDate(marker.date)
                  if (!at) return null
                  return (
                    <ReferenceDot
                      key={`${at.getTime()}-${marker.value}`}
                      x={at.getTime()}
                      y={marker.value}
                      r={4.5}
                      fill="var(--color-background)"
                      stroke="var(--color-brand)"
                      strokeWidth={2}
                    />
                  )
                })}
                {activePoint === undefined ? null : (
                  <ReferenceLine
                    x={activePoint.t}
                    stroke="var(--color-border-strong)"
                    strokeWidth={1}
                  />
                )}
                {activePoint === undefined ||
                activePoint.value === null ? null : (
                  <ReferenceDot
                    x={activePoint.t}
                    y={activePoint.value}
                    r={4}
                    fill="var(--color-background)"
                    stroke="var(--color-brand)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ChartContainer>
          </div>

          {referenceLine?.label === undefined ? null : (
            <div
              data-slot="hero-chart-reference-label"
              className="pointer-events-none absolute right-0 -translate-y-1/2 rounded-chip border border-border-strong bg-background px-[7px] py-[3px] font-mono text-[10px] leading-none font-semibold whitespace-nowrap text-ink-2"
              style={{
                top:
                  PLOT_MARGIN.top +
                  (height - PLOT_MARGIN.top) *
                    valueOffsetRatio(referenceLine.value, domain),
              }}
            >
              {referenceLine.label}
            </div>
          )}

          <div
            data-slot="hero-chart-scrubber"
            role="slider"
            tabIndex={0}
            aria-label={scrubLabel}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, points.length - 1)}
            aria-valuenow={activeIndex ?? Math.max(0, points.length - 1)}
            aria-valuetext={scrubValueText()}
            className={cn("absolute inset-0 touch-none", FOCUS_RING_INSET)}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIndex(null)}
            onKeyDown={handleKeyDown}
            onBlur={() => setActiveIndex(null)}
          />
        </div>
      ) : (
        <div
          data-slot="hero-chart-empty"
          className="mt-5 flex items-end justify-center border-b border-dashed border-border-strong pb-4"
          style={{ height }}
        >
          <span className="text-[12.5px] leading-none text-ink-3">
            {emptyLabel}
          </span>
        </div>
      )}

      {plottable && ticks.length > 0 ? (
        <div
          data-slot="hero-chart-axis"
          className="mt-[10px] flex justify-between font-mono text-[10px] leading-none font-medium text-ink-3"
        >
          {ticks.map((tick, index) => (
            <span key={`${tick}-${index}`}>{tick}</span>
          ))}
        </div>
      ) : null}

      {degraded === undefined ? null : (
        <div
          data-slot="hero-chart-degraded"
          className="mt-[10px] flex items-start gap-[7px]"
        >
          <span
            aria-hidden
            className="text-[11px] leading-[1.5] font-semibold text-attention"
          >
            ◇
          </span>
          <span className="text-[11px] leading-[1.5] text-ink-3">
            {degraded}
          </span>
        </div>
      )}

      {footer === undefined ? null : (
        <div data-slot="hero-chart-footer" className="mt-[10px]">
          {footer}
        </div>
      )}
    </section>
  )
}

function periodNote(days: number): string {
  if (days <= 0) return "today"
  return `over ${countOf(days, "day")}`
}
