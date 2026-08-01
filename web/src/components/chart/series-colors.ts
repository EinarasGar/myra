export const SERIES_COLOR_VARS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
] as const

export const SERIES_COLOR_COUNT = SERIES_COLOR_VARS.length

export const SERIES_OVERFLOW_COLOR = "var(--color-ink-3)"

export const SERIES_OVERFLOW_KEY = "__other__"

export interface SeriesColors {
  readonly keys: readonly string[]
  indexFor(key: string): number
  colorFor(key: string): string
  isOverflow(key: string): boolean
}

export function createSeriesColors(keys: Iterable<string>): SeriesColors {
  const ordered: string[] = []
  const indexes = new Map<string, number>()
  for (const key of keys) {
    if (indexes.has(key)) continue
    indexes.set(key, ordered.length)
    ordered.push(key)
  }

  const indexFor = (key: string): number => {
    const index = indexes.get(key)
    return index === undefined || index >= SERIES_COLOR_COUNT ? -1 : index
  }

  return {
    keys: ordered,
    indexFor,
    isOverflow: (key) => indexFor(key) === -1,
    colorFor: (key) =>
      SERIES_COLOR_VARS[indexFor(key)] ?? SERIES_OVERFLOW_COLOR,
  }
}

export interface CollapseOptions<T> {
  weightOf: (item: T) => number
  limit?: number
  merge: (tail: readonly T[], weight: number) => T
}

export function collapseToTop<T>(
  items: readonly T[],
  { weightOf, limit = SERIES_COLOR_COUNT, merge }: CollapseOptions<T>
): T[] {
  const sorted = [...items].sort((a, b) => weightOf(b) - weightOf(a))
  if (sorted.length <= limit) return sorted
  const head = sorted.slice(0, limit - 1)
  const tail = sorted.slice(limit - 1)
  const weight = tail.reduce((total, item) => total + weightOf(item), 0)
  return [...head, merge(tail, weight)]
}
