import { SHELL_WIDTHS, type ShellWidth } from "@/components/layout/breakpoints"

export type Responsive<T> = T | ({ full: T } & Partial<Record<ShellWidth, T>>)

export type DataTableColumns = Responsive<string>

export type ColumnMetrics = { gap: number; padding: number }

const MIN_VIEWPORT: Record<ShellWidth, number> = {
  phone: 360,
  stacked: 768,
  tight: 1024,
  full: 1280,
}

const RAIL_WIDTH: Record<ShellWidth, number> = {
  phone: 0,
  stacked: 0,
  tight: 58,
  full: 58,
}

const PAGE_PADDING_X: Record<ShellWidth, number> = {
  phone: 16,
  stacked: 20,
  tight: 28,
  full: 40,
}

export const MAX_TABLE_WIDTH = Object.fromEntries(
  SHELL_WIDTHS.map((width) => [
    width,
    MIN_VIEWPORT[width] - RAIL_WIDTH[width] - PAGE_PADDING_X[width] * 2,
  ])
) as Record<ShellWidth, number>

const WIDEST_FIRST = [...SHELL_WIDTHS].reverse()

export function resolveResponsive<T>(
  value: Responsive<T>
): Record<ShellWidth, T> {
  const resolved = {} as Record<ShellWidth, T>
  if (typeof value !== "object" || value === null) {
    for (const width of SHELL_WIDTHS) resolved[width] = value
    return resolved
  }
  const declared = value as { full: T } & Partial<Record<ShellWidth, T>>
  let inherited = declared.full
  for (const width of WIDEST_FIRST) {
    inherited = declared[width] ?? inherited
    resolved[width] = inherited
  }
  return resolved
}

function splitTracks(template: string): string[] {
  const tracks: string[] = []
  let depth = 0
  let current = ""
  for (const char of template) {
    if (char === "(") depth += 1
    if (char === ")") depth -= 1
    if (depth === 0 && /\s/.test(char)) {
      if (current) tracks.push(current)
      current = ""
      continue
    }
    current += char
  }
  if (current) tracks.push(current)
  return tracks
}

function trackMinWidth(track: string): number {
  const floor = /^minmax\(([^,]+),/.exec(track)?.[1]
  if (floor !== undefined) return trackMinWidth(floor.trim())
  const pixels = /^(\d+(?:\.\d+)?)px$/.exec(track)?.[1]
  if (pixels !== undefined) return Number(pixels)
  if (track === "0" || /^\d*\.?\d+fr$/.test(track)) return 0
  throw new Error(
    `DataTable column track "${track}" has no measurable minimum width, so the no-sideways-scroll guarantee cannot be checked. Give it a floor, e.g. minmax(96px,${track}).`
  )
}

export function columnTemplateMinWidth(
  template: string,
  { gap, padding }: ColumnMetrics
): number {
  const tracks = splitTracks(template)
  const fixed = tracks.reduce((total, track) => total + trackMinWidth(track), 0)
  return fixed + gap * Math.max(tracks.length - 1, 0) + padding * 2
}

export function normalizeColumnTemplate(template: string): string {
  return splitTracks(template)
    .map((track) =>
      /^\d*\.?\d+fr$/.test(track) ? `minmax(0,${track})` : track
    )
    .join(" ")
}

export function resolveColumnTemplates(
  columns: DataTableColumns
): Record<ShellWidth, string> {
  const resolved = resolveResponsive(columns)
  for (const width of SHELL_WIDTHS) {
    resolved[width] = normalizeColumnTemplate(resolved[width])
  }
  return resolved
}

export type ColumnLayout = ColumnMetrics & { template: string }

export function resolveColumnLayout(
  columns: DataTableColumns,
  gap: Responsive<number>,
  padding: Responsive<number>
): Record<ShellWidth, ColumnLayout> {
  const templates = resolveColumnTemplates(columns)
  const gaps = resolveResponsive(gap)
  const paddings = resolveResponsive(padding)
  const metrics = {} as Record<ShellWidth, ColumnMetrics>
  for (const width of SHELL_WIDTHS) {
    metrics[width] = { gap: gaps[width], padding: paddings[width] }
  }
  assertColumnsFitEveryWidth(templates, metrics)

  const layout = {} as Record<ShellWidth, ColumnLayout>
  for (const width of SHELL_WIDTHS) {
    layout[width] = { template: templates[width], ...metrics[width] }
  }
  return layout
}

export function columnTrackCount(template: string): number {
  return splitTracks(template).length
}

export type RowArity = {
  slot: string
  label?: string
  width: ShellWidth
  template: string
  cells: number
}

export function rowArityMismatch({
  slot,
  label,
  width,
  template,
  cells,
}: RowArity): string | null {
  const tracks = columnTrackCount(template)
  if (cells === tracks) return null

  const where = label === undefined ? "" : ` in "${label}"`
  const missing = tracks - cells
  const consequence =
    cells > tracks
      ? `cell ${tracks + 1} wraps onto a second implicit grid row inside the fixed row height`
      : `leaving ${missing} track${missing === 1 ? "" : "s"} empty and the cells under the wrong headers`
  return `DataTable ${slot}${where} renders ${cells} cell${cells === 1 ? "" : "s"} at the "${width}" width, but its template "${template}" has ${tracks} tracks — ${consequence}. Emit exactly one cell per track at every width: labels go first, then columns, and the amount column is the last thing standing.`
}

export function rowOutsideTableMessage(slot: string): string {
  return `DataTable ${slot} rendered outside a DataTable, so nothing can check its cells against a column template. Every grid row belongs inside the <DataTable> whose columns it is laid out on; a block-level row that spans the grid should be a DayBandRow or a TableFoldRow.`
}

export type BandSpan = {
  label?: string
  width: ShellWidth
  template: string
  span: number
  cells: number
}

export function bandSpanMismatch({
  label,
  width,
  template,
  span,
  cells,
}: BandSpan): string | null {
  const tracks = columnTrackCount(template)
  const where = label === undefined ? "" : ` in "${label}"`
  if (cells !== 1) {
    return `DataTable spanning row${where} renders ${cells} cells at the "${width}" width. A row that declares aria-colspan spans the whole grid and must hold exactly one cell.`
  }
  if (span === tracks) return null
  return `DataTable spanning row${where} declares aria-colspan ${span} at the "${width}" width, but its template "${template}" has ${tracks} tracks. A day band, a fold row and a totals band all span the grid, so their span has to follow the template that width resolves to — derive it from the same source as the cells, never from a hand-counted number.`
}

export function assertColumnsFitEveryWidth(
  templates: Record<ShellWidth, string>,
  metrics: Record<ShellWidth, ColumnMetrics>
): void {
  for (const width of SHELL_WIDTHS) {
    const template = templates[width]
    const required = columnTemplateMinWidth(template, metrics[width])
    if (required <= MAX_TABLE_WIDTH[width]) continue
    throw new Error(
      `DataTable columns "${template}" need ${required}px at the "${width}" width, which has ${MAX_TABLE_WIDTH[width]}px. Declare a narrower "${width}" template — labels go first, then columns, and the amount column is the last thing standing.`
    )
  }
}
