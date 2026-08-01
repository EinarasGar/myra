export const PICKER_EMPTY = "Nothing matches that."
export const PICKER_SEARCHING = "Searching…"
export const PICKER_CLEAR = "Clear"
export const PICKER_OPEN = "Show options"
export const PICKER_LOAD_MORE = "Load more"

export interface PickerOption {
  readonly value: string
  readonly label: string
  readonly subLabel?: string
  readonly group?: string
  readonly keywords?: readonly string[]
  readonly identity?: string
  readonly icon?: string
}

/**
 * An async source drives the list from a server search, so the picker must not filter a
 * second time and the count line has to name the loaded page against the whole result set.
 */
export interface PickerSearch {
  readonly query: string
  readonly onQueryChange: (query: string) => void
  readonly pending: boolean
  readonly hasMore: boolean
  readonly onLoadMore: () => void
  readonly total: number | null
}

export interface PickerGroup {
  readonly value: string
  readonly label: string
  readonly items: readonly PickerOption[]
}

export function pickerOptionMatches(
  option: PickerOption,
  query: string
): boolean {
  const trimmed = query.trim().toLowerCase()
  if (trimmed === "") return true
  const haystack = [
    option.label,
    option.subLabel ?? "",
    ...(option.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase()
  return trimmed.split(/\s+/).every((token) => haystack.includes(token))
}

export function groupPickerOptions(
  options: readonly PickerOption[]
): readonly PickerGroup[] {
  const order: string[] = []
  const members = new Map<string, PickerOption[]>()
  for (const option of options) {
    const label = option.group ?? ""
    const existing = members.get(label)
    if (existing === undefined) {
      order.push(label)
      members.set(label, [option])
      continue
    }
    existing.push(option)
  }
  return order.map((label) => ({
    value: label,
    label,
    items: members.get(label) ?? [],
  }))
}

export function pickerStatusLine(
  matchCount: number,
  search: PickerSearch | undefined
): string {
  if (search?.pending === true) return PICKER_SEARCHING
  if (matchCount === 0) return ""
  const total = search?.total ?? null
  if (total !== null && total > matchCount) {
    return `Showing ${String(matchCount)} of ${String(total)} matches`
  }
  return matchCount === 1 ? "1 match" : `${String(matchCount)} matches`
}
