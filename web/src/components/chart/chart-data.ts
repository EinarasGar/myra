import {
  formatDateStamp,
  formatDateTimeStamp,
  formatMonthStamp,
  formatTimeStamp,
  toDate,
  type DateInput,
} from "@/lib/format"

export interface ChartPoint {
  date: DateInput
  value: number | null
}

export interface ResolvedPoint {
  t: number
  value: number | null
}

export type ChartShape = "asset" | "liability"

const DAY_MS = 24 * 60 * 60 * 1000

export function unixSecondsToMs(seconds: number): number {
  return seconds * 1000
}

export function toChartPoints(
  rows: readonly { date: number; rate: number | null }[]
): ChartPoint[] {
  return rows.map((row) => ({
    date: unixSecondsToMs(row.date),
    value: row.rate,
  }))
}

export function resolvePoints(points: readonly ChartPoint[]): ResolvedPoint[] {
  const resolved: ResolvedPoint[] = []
  for (const point of points) {
    const date = toDate(point.date)
    if (!date) continue
    const value =
      typeof point.value === "number" && Number.isFinite(point.value)
        ? point.value
        : null
    resolved.push({ t: date.getTime(), value })
  }
  return resolved.sort((a, b) => a.t - b.t)
}

export function hasPlottableSeries(points: readonly ResolvedPoint[]): boolean {
  let plottable = 0
  for (const point of points) {
    if (point.value !== null) plottable += 1
    if (plottable >= 2) return true
  }
  return false
}

export interface ChartDelta {
  from: number
  to: number
  change: number
  ratio: number | null
}

export function chartDelta(
  points: readonly ResolvedPoint[],
  toIndex?: number
): ChartDelta | null {
  const first = points.find((point) => point.value !== null)
  if (!first || first.value === null) return null

  const end =
    toIndex === undefined
      ? [...points].reverse().find((point) => point.value !== null)
      : points[toIndex]
  if (!end || end.value === null) return null

  const change = end.value - first.value
  return {
    from: first.value,
    to: end.value,
    change,
    ratio: first.value === 0 ? null : change / Math.abs(first.value),
  }
}

function edges(
  points: readonly ResolvedPoint[]
): { first: number; last: number } | null {
  const first = points.at(0)
  const last = points.at(-1)
  if (!first || !last) return null
  return { first: first.t, last: last.t }
}

export function spanInDays(points: readonly ResolvedPoint[]): number {
  const bounds = edges(points)
  if (!bounds || points.length < 2) return 0
  return Math.max(0, Math.round((bounds.last - bounds.first) / DAY_MS))
}

export function yDomainFor(
  points: readonly ResolvedPoint[],
  shape: ChartShape = "asset"
): [number, number] {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null)
  if (values.length === 0) return shape === "liability" ? [-1, 0] : [0, 1]

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const pad = range === 0 ? Math.abs(max) * 0.1 || 1 : range * 0.1

  if (shape === "liability") return [min - pad, Math.max(0, max)]
  return [min - pad, max + pad]
}

export function baseValueFor(
  domain: readonly [number, number],
  shape: ChartShape = "asset"
): number {
  const [min] = domain
  return shape === "liability" ? 0 : min
}

export function indexAtRatio(
  points: readonly ResolvedPoint[],
  ratio: number
): number | null {
  const bounds = edges(points)
  if (!bounds) return null
  if (points.length === 1) return 0

  const clamped = Math.min(1, Math.max(0, ratio))
  if (bounds.last === bounds.first) {
    return Math.round(clamped * (points.length - 1))
  }

  const target = bounds.first + clamped * (bounds.last - bounds.first)
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  points.forEach((point, index) => {
    const distance = Math.abs(point.t - target)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

export function ratioAtIndex(
  points: readonly ResolvedPoint[],
  index: number
): number {
  const bounds = edges(points)
  const point = points.at(index)
  if (!bounds || !point || points.length < 2) return 0
  if (bounds.last === bounds.first) return index / (points.length - 1)
  return (point.t - bounds.first) / (bounds.last - bounds.first)
}

export function axisTicks(
  points: readonly ResolvedPoint[],
  count = 5,
  locale?: string
): string[] {
  if (points.length === 0 || count < 2) return []
  const stamp = stampFormatterFor(points, locale)
  const last = points.length - 1
  const ticks: string[] = []
  for (let step = 0; step < count; step += 1) {
    const point = points.at(Math.round((step / (count - 1)) * last))
    if (point) ticks.push(stamp(point.t))
  }
  return ticks
}

export function stampFormatterFor(
  points: readonly ResolvedPoint[],
  locale?: string
): (t: number) => string {
  const days = spanInDays(points)
  if (days <= 1) return (t) => formatTimeStamp(t, { locale })
  if (days <= 400) return (t) => formatDateStamp(t, { locale })
  return (t) => formatMonthStamp(t, { locale })
}

export function pointStamp(
  points: readonly ResolvedPoint[],
  index: number,
  locale?: string
): string {
  const point = points.at(index)
  if (!point) return ""
  const days = spanInDays(points)
  if (days <= 1) return formatDateTimeStamp(point.t, { locale })
  return formatDateStamp(point.t, { locale, year: "always" })
}

export function valueOffsetRatio(
  value: number,
  domain: readonly [number, number]
): number {
  const [min, max] = domain
  if (max === min) return 0.5
  const ratio = (max - value) / (max - min)
  return Math.min(1, Math.max(0, ratio))
}
