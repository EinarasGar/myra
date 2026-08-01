import type { TransactionVisibility } from "@/api"

export interface CachedTransaction {
  transaction_id: string
  item_type?: string
  visibility?: TransactionVisibility
}

export interface CachedGroup {
  item_type: "group"
  group_id: string
  transactions: CachedTransaction[]
}

export type CachedItem = CachedTransaction | CachedGroup

export type ItemMapper = (item: CachedItem) => CachedItem | null

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isGroupItem(item: CachedItem): item is CachedGroup {
  return (
    "item_type" in item &&
    item.item_type === "group" &&
    Array.isArray((item as CachedGroup).transactions)
  )
}

function mapPage(page: unknown, mapItem: ItemMapper): unknown {
  if (!isRecord(page) || !Array.isArray(page.results)) return page
  const results = (page.results as CachedItem[])
    .map(mapItem)
    .filter((item): item is CachedItem => item !== null)
  return { ...page, results }
}

export function mapCachedTransactions(
  data: unknown,
  mapItem: ItemMapper
): unknown {
  if (!isRecord(data)) return data
  if (Array.isArray(data.pages)) {
    return { ...data, pages: data.pages.map((page) => mapPage(page, mapItem)) }
  }
  return mapPage(data, mapItem)
}
