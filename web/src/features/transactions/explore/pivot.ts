import { accountLabel, isCurrencyAsset } from "@/lib/domain/refs"
import { formatDateStamp, formatDayLabel } from "@/lib/format"
import type { TransactionId } from "@/lib/query"

import type { LedgerRow, LedgerTransactionRow, NativeAmount } from "../api"
import { assetUnitsOf, groupRowsByDay, isGroupRow, sumByAsset } from "../api"

export const GROUP_BY_MODES = [
  "day",
  "merchant",
  "category",
  "account",
  "type",
] as const

export type GroupByMode = (typeof GROUP_BY_MODES)[number]

export const GROUP_BY_LABELS: Record<GroupByMode, string> = {
  day: "Day",
  merchant: "Merchant",
  category: "Category",
  account: "Account",
  type: "Type",
}

export function isGroupByMode(value: string): value is GroupByMode {
  return (GROUP_BY_MODES as readonly string[]).includes(value)
}

export const MERCHANT_UNSUPPORTED =
  "Sverto has no merchant field. The closest thing is the description, and eleven of the thirteen transaction types have none — theirs is written by this app from their own entries. Grouping on that would invent merchants that do not exist."

export const NO_CATEGORY_LABEL = "No category"
export const UNCATEGORISED_LABEL = "Uncategorised"

export const CATEGORY_NOTE =
  "Only everyday purchases carry a category. Every other type is filed under “No category” because Sverto does not store one for them."

export const ACCOUNT_NOTE =
  "A transaction that moves money between two accounts is filed under the account of its primary entry, so it is counted once, not twice."

export const MIXED_CURRENCY_SHARE_NOTE =
  "Share bars are hidden because these subtotals are in more than one currency and nothing converts a transaction, so the groups cannot be compared on one scale."

export interface PivotGroup {
  readonly key: string
  readonly label: string
  readonly meta: string
  readonly rows: readonly LedgerRow[]
  readonly transactionCount: number
  readonly totals: readonly NativeAmount[]
  readonly share: number | null
}

export interface PivotResult {
  readonly mode: GroupByMode
  readonly groups: readonly PivotGroup[]
  readonly unsupported: string | null
  readonly note: string | null
  readonly shareNote: string | null
}

/**
 * The signed currency-denominated entries and fees a row contributes, which is the same
 * definition `LedgerDay.netByCurrency` uses — a pivot subtotal and a day-band net must
 * answer the same question.
 */
export function ledgerCurrencyAmounts(row: LedgerRow): NativeAmount[] {
  const transactions = isGroupRow(row) ? row.children : [row]
  const amounts: NativeAmount[] = []
  for (const transaction of transactions) {
    if (transaction.isHidden) continue
    for (const leg of transaction.legs) {
      if (isCurrencyAsset(leg.amount.asset)) amounts.push(leg.amount)
    }
    for (const fee of transaction.fees) {
      if (isCurrencyAsset(fee.amount.asset)) amounts.push(fee.amount)
    }
  }
  return amounts
}

/**
 * Render order, not load order: a collapsed group's children are off screen, so stepping the
 * drawer must not walk through them.
 */
export function visibleTransactionIds(
  groups: readonly PivotGroup[],
  expanded: ReadonlySet<string>
): TransactionId[] {
  const ids: TransactionId[] = []
  for (const group of groups) {
    for (const row of group.rows) {
      if (!isGroupRow(row)) {
        ids.push(row.transactionId)
        continue
      }
      if (!expanded.has(row.rowId)) continue
      for (const child of row.children) ids.push(child.transactionId)
    }
  }
  return ids
}

export function transactionRowIndex(
  groups: readonly PivotGroup[]
): Record<TransactionId, LedgerTransactionRow> {
  const index: Record<TransactionId, LedgerTransactionRow> = {}
  for (const group of groups) {
    for (const row of group.rows) {
      if (!isGroupRow(row)) {
        index[row.transactionId] = row
        continue
      }
      for (const child of row.children) index[child.transactionId] = child
    }
  }
  return index
}

export function rowTransactionCount(row: LedgerRow): number {
  return isGroupRow(row) ? row.childCount : 1
}

function countTransactions(rows: readonly LedgerRow[]): number {
  return rows.reduce((total, row) => total + rowTransactionCount(row), 0)
}

function transactionsMeta(count: number): string {
  return `${String(count)} ${count === 1 ? "transaction" : "transactions"}`
}

interface Bucket {
  key: string
  label: string
  rows: LedgerRow[]
}

function bucketBy(
  rows: readonly LedgerRow[],
  classify: (row: LedgerRow) => { key: string; label: string }
): Bucket[] {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const { key, label } = classify(row)
    const existing = buckets.get(key)
    if (existing === undefined) {
      buckets.set(key, { key, label, rows: [row] })
      continue
    }
    existing.rows.push(row)
  }
  return [...buckets.values()]
}

function accountBucket(row: LedgerRow): { key: string; label: string } {
  const account = isGroupRow(row) ? (row.accounts[0] ?? null) : row.account
  if (account === null) return { key: "unknown-account", label: "No account" }
  return { key: account.accountId, label: accountLabel(account) }
}

function categoryBucket(row: LedgerRow): { key: string; label: string } {
  if (row.category !== null) {
    return {
      key: `category-${String(row.category.id)}`,
      label: row.category.name,
    }
  }
  if (!row.categorySupported) {
    return { key: "no-category", label: NO_CATEGORY_LABEL }
  }
  return { key: "uncategorised", label: UNCATEGORISED_LABEL }
}

function typeBucket(row: LedgerRow): { key: string; label: string } {
  if (isGroupRow(row)) return { key: "group", label: "Group" }
  return { key: row.type, label: row.typeName }
}

function magnitude(totals: readonly NativeAmount[]): number {
  return totals.reduce(
    (largest, amount) => Math.max(largest, Math.abs(assetUnitsOf(amount))),
    0
  )
}

function isSingleCurrency(
  groups: readonly Omit<PivotGroup, "share">[]
): boolean {
  const assets = new Set<number>()
  for (const group of groups) {
    if (group.totals.length > 1) return false
    for (const total of group.totals) assets.add(total.asset.assetId)
  }
  return assets.size <= 1
}

function withShares(groups: readonly Omit<PivotGroup, "share">[]): {
  groups: PivotGroup[]
  shareNote: string | null
} {
  if (!isSingleCurrency(groups)) {
    return {
      groups: groups.map((group) => ({ ...group, share: null })),
      shareNote: MIXED_CURRENCY_SHARE_NOTE,
    }
  }
  const largest = groups.reduce(
    (biggest, group) => Math.max(biggest, magnitude(group.totals)),
    0
  )
  return {
    groups: groups.map((group) => ({
      ...group,
      share: largest === 0 ? null : magnitude(group.totals) / largest,
    })),
    shareNote: null,
  }
}

function byDay(rows: readonly LedgerRow[]): Omit<PivotGroup, "share">[] {
  return groupRowsByDay(rows).map((day) => ({
    key: day.key,
    label: formatDayLabel(day.date),
    meta: formatDateStamp(day.date),
    rows: day.rows,
    transactionCount: countTransactions(day.rows),
    totals: day.netByCurrency,
  }))
}

function byBucket(
  rows: readonly LedgerRow[],
  classify: (row: LedgerRow) => { key: string; label: string }
): Omit<PivotGroup, "share">[] {
  return bucketBy(rows, classify)
    .map((bucket) => {
      const transactionCount = countTransactions(bucket.rows)
      return {
        key: bucket.key,
        label: bucket.label,
        meta: transactionsMeta(transactionCount),
        rows: bucket.rows as readonly LedgerRow[],
        transactionCount,
        totals: sumByAsset(bucket.rows.flatMap(ledgerCurrencyAmounts)),
      }
    })
    .sort((a, b) => {
      const difference = magnitude(b.totals) - magnitude(a.totals)
      return difference === 0
        ? b.transactionCount - a.transactionCount
        : difference
    })
}

function categoryNote(groups: readonly Omit<PivotGroup, "share">[]): string {
  const uncategorised = groups.find((group) => group.key === "no-category")
  if (uncategorised === undefined) return CATEGORY_NOTE
  return `${CATEGORY_NOTE} ${String(uncategorised.transactionCount)} of the loaded transactions land there.`
}

export function pivotRows(
  rows: readonly LedgerRow[],
  mode: GroupByMode
): PivotResult {
  if (mode === "merchant") {
    return {
      mode,
      groups: [],
      unsupported: MERCHANT_UNSUPPORTED,
      note: null,
      shareNote: null,
    }
  }

  if (mode === "day") {
    const groups = byDay(rows)
    return {
      mode,
      groups: groups.map((group) => ({ ...group, share: null })),
      unsupported: null,
      note: null,
      shareNote: null,
    }
  }

  const buckets =
    mode === "account"
      ? byBucket(rows, accountBucket)
      : mode === "category"
        ? byBucket(rows, categoryBucket)
        : byBucket(rows, typeBucket)

  const shared = withShares(buckets)

  return {
    mode,
    groups: shared.groups,
    unsupported: null,
    note:
      mode === "account"
        ? ACCOUNT_NOTE
        : mode === "category"
          ? categoryNote(buckets)
          : null,
    shareNote: shared.shareNote,
  }
}
