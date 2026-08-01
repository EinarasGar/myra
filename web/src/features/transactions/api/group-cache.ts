import type {
  GroupTransactionItem,
  RequiredIdentifiableTransaction,
} from "@/api"

import { isRecord } from "./cache-shape"

type CachedItem = Record<string, unknown>

type ResultsEdit = (results: readonly CachedItem[]) => readonly CachedItem[]

/**
 * Only a listing whose every row is tagged `item_type` can hold a group, so the
 * account-scoped pages — which return bare transactions and are unaffected by grouping —
 * are left exactly as they were.
 */
function isLedgerPage(page: unknown): page is { results: CachedItem[] } {
  return (
    isRecord(page) &&
    Array.isArray(page.results) &&
    page.results.length > 0 &&
    page.results.every((item) => isRecord(item) && "item_type" in item)
  )
}

function editPage(page: unknown, edit: ResultsEdit): unknown {
  if (!isLedgerPage(page)) return page
  const results = edit(page.results)
  return results === page.results ? page : { ...page, results }
}

function editPages(data: unknown, edit: ResultsEdit): unknown {
  if (!isRecord(data)) return data
  const cached: unknown = data.pages
  if (!Array.isArray(cached)) return editPage(data, edit)

  const pages: unknown[] = cached.map((page) => editPage(page, edit))
  return pages.every((page, index) => page === cached[index])
    ? data
    : { ...data, pages }
}

function isGroup(item: CachedItem): boolean {
  return item.item_type === "group" && Array.isArray(item.transactions)
}

function childrenOf(item: CachedItem): CachedItem[] {
  return Array.isArray(item.transactions)
    ? (item.transactions as CachedItem[])
    : []
}

function asItem(value: unknown): CachedItem {
  return value as CachedItem
}

function individualItem(
  transaction: RequiredIdentifiableTransaction
): CachedItem {
  return { item_type: "individual", ...transaction } as unknown as CachedItem
}

function memberIdsOf(group: GroupTransactionItem): ReadonlySet<string> {
  return new Set(group.transactions.map((child) => child.transaction_id))
}

/**
 * N selected rows become one parent row holding N transactions: the members are lifted out
 * of the listing and the group takes the position of the first of them, so the row count
 * falls by N-1 while the transaction count — and therefore every day-band net — is unmoved.
 */
export function collapseIntoGroupInCache(
  data: unknown,
  group: GroupTransactionItem
): unknown {
  const members = memberIdsOf(group)
  let inserted = false

  return editPages(data, (results) => {
    let firstMatch = -1
    const kept: CachedItem[] = []

    for (const item of results) {
      if (!isGroup(item) && members.has(item.transaction_id as string)) {
        if (firstMatch === -1) firstMatch = kept.length
        continue
      }
      kept.push(item)
    }

    if (firstMatch === -1) return results
    if (!inserted) {
      inserted = true
      kept.splice(firstMatch, 0, asItem(group))
    }
    return kept
  })
}

/**
 * A page that does not carry the group is left alone: moving a row out of the listing
 * without the parent it joined would show a transaction that belongs nowhere.
 */
export function updateGroupInCache(
  data: unknown,
  group: GroupTransactionItem
): unknown {
  const members = memberIdsOf(group)

  return editPages(data, (results) => {
    const index = results.findIndex(
      (item) => isGroup(item) && item.group_id === group.group_id
    )
    if (index === -1) return results

    return results
      .map((item, position) => (position === index ? asItem(group) : item))
      .filter(
        (item, position) =>
          position === index ||
          isGroup(item) ||
          !members.has(item.transaction_id as string)
      )
  })
}

export function detachFromGroupInCache(
  data: unknown,
  input: {
    readonly groupId: string
    readonly transaction: RequiredIdentifiableTransaction
  }
): unknown {
  return editPages(data, (results) => {
    const index = results.findIndex(
      (item) => isGroup(item) && item.group_id === input.groupId
    )
    const group = results[index]
    if (index === -1 || group === undefined) return results

    const children = childrenOf(group)
    const remaining = children.filter(
      (child) => child.transaction_id !== input.transaction.transaction_id
    )
    if (remaining.length === children.length) return results

    const next = [...results]
    const freed = individualItem(input.transaction)
    if (remaining.length === 0) {
      next.splice(index, 1, freed)
    } else {
      next.splice(index, 1, { ...group, transactions: remaining }, freed)
    }
    return next
  })
}
