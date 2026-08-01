import type {
  CombinedTransactionItem,
  GroupTransactionItem,
  RequiredIdentifiableTransaction,
} from "@/api"
import type { FigureIntent } from "@/components/figure"
import type { AccountRef } from "@/lib/domain/refs"
import { isCurrencyAsset } from "@/lib/domain/refs"
import {
  carriesCategory,
  transactionFigureIntent,
  transactionTypeName,
} from "@/lib/domain/transaction-types"
import type { AccountId } from "@/lib/query"

import { legDirection, sumByAsset } from "./amounts"
import { describeGroup, describeTransaction } from "./descriptions"
import { rawLegs, transactionCategoryId } from "./legs"
import type { LookupIndex } from "./lookup"
import { resolveAccount, resolveAsset } from "./lookup"
import { asTransaction, isGroupItem } from "./narrow"
import type {
  LedgerDay,
  LedgerFee,
  LedgerGroupRow,
  LedgerLeg,
  LedgerRow,
  LedgerTransactionRow,
  NativeAmount,
} from "./types"
import { BASE_CURRENCY_AMOUNT_UNAVAILABLE, nativeAmount } from "./types"

function uniqueAccounts(
  legs: readonly { account: AccountRef }[]
): AccountRef[] {
  const seen = new Map<AccountId, AccountRef>()
  for (const leg of legs) {
    if (!seen.has(leg.account.accountId)) {
      seen.set(leg.account.accountId, leg.account)
    }
  }
  return [...seen.values()]
}

export function toTransactionRow(
  transaction: RequiredIdentifiableTransaction,
  lookup: LookupIndex,
  groupId: string | null = null
): LedgerTransactionRow {
  const legs: LedgerLeg[] = rawLegs(transaction).map((leg) => {
    const amount = nativeAmount(
      leg.entry.amount,
      resolveAsset(lookup, leg.entry.asset_id)
    )
    return {
      entryId: leg.entry.entry_id,
      role: leg.role,
      direction: legDirection(leg.entry.amount),
      placement: leg.placement,
      amountKind: leg.amountKind,
      label: leg.label,
      account: resolveAccount(lookup, leg.entry.account_id),
      amount,
    }
  })

  const fees: LedgerFee[] = (transaction.fees ?? []).map((fee) => ({
    entryId: fee.entry_id,
    feeType: fee.fee_type,
    account: resolveAccount(lookup, fee.account_id),
    amount: nativeAmount(fee.amount, resolveAsset(lookup, fee.asset_id)),
  }))

  const primaryLeg = legs.find((leg) => leg.role === "primary") ?? null
  const categoryId = transactionCategoryId(transaction)
  const visibility = transaction.visibility ?? "default"

  return {
    kind: "transaction",
    rowId: transaction.transaction_id,
    transactionId: transaction.transaction_id,
    groupId,
    type: transaction.type,
    typeName: transactionTypeName(transaction.type),
    date: new Date(transaction.date * 1000),
    visibility,
    isUnreviewed: visibility === "ghost",
    isHidden: visibility === "hidden",
    description: describeTransaction(transaction, lookup),
    category:
      categoryId === null ? null : (lookup.categories.get(categoryId) ?? null),
    categorySupported: carriesCategory(transaction.type),
    account: primaryLeg?.account ?? null,
    accounts: uniqueAccounts(legs),
    legs,
    primaryLeg,
    primaryAmount: primaryLeg?.amount ?? null,
    figureIntent:
      visibility === "ghost"
        ? "ghost"
        : transactionFigureIntent(transaction.type),
    fees,
    baseCurrencyAmount: BASE_CURRENCY_AMOUNT_UNAVAILABLE,
    raw: transaction,
  }
}

function groupFigureIntent(
  children: readonly LedgerTransactionRow[]
): FigureIntent {
  if (children.some((child) => child.isUnreviewed)) return "ghost"
  const intents = new Set(children.map((child) => child.figureIntent))
  if (intents.size !== 1) return "neutral"
  const [only] = intents
  return only ?? "neutral"
}

export function toGroupRow(
  group: GroupTransactionItem,
  lookup: LookupIndex
): LedgerGroupRow {
  const children = group.transactions.map((child) =>
    toTransactionRow(child, lookup, group.group_id)
  )

  return {
    kind: "group",
    rowId: group.group_id,
    groupId: group.group_id,
    date: new Date(group.date * 1000),
    description: describeGroup(group, lookup),
    category: lookup.categories.get(group.category_id) ?? null,
    categorySupported: true,
    accounts: uniqueAccounts(children.flatMap((child) => child.legs)),
    children,
    childCount: children.length,
    amountsByAsset: sumByAsset(
      children.flatMap((child) => child.legs.map((leg) => leg.amount))
    ),
    isUnreviewed: children.some((child) => child.isUnreviewed),
    figureIntent: groupFigureIntent(children),
    baseCurrencyAmount: BASE_CURRENCY_AMOUNT_UNAVAILABLE,
    raw: group,
  }
}

export function toLedgerRows(
  items: readonly CombinedTransactionItem[],
  lookup: LookupIndex
): LedgerRow[] {
  const rows: LedgerRow[] = []
  for (const item of items) {
    if (isGroupItem(item)) {
      rows.push(toGroupRow(item, lookup))
      continue
    }
    const transaction = asTransaction(item)
    if (transaction !== null) rows.push(toTransactionRow(transaction, lookup))
  }
  return rows
}

export function toTransactionRows(
  transactions: readonly RequiredIdentifiableTransaction[],
  lookup: LookupIndex
): LedgerTransactionRow[] {
  return transactions.map((transaction) =>
    toTransactionRow(transaction, lookup)
  )
}

function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function currencyAmountsOf(row: LedgerRow): NativeAmount[] {
  const rows = row.kind === "group" ? row.children : [row]
  const amounts: NativeAmount[] = []
  for (const transaction of rows) {
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
 * `netByCurrency` is the signed sum of the day's currency-denominated entries and fees,
 * one figure per currency. Nothing converts a transaction, so it is not a base-currency
 * total and a multi-currency day yields several figures rather than one.
 */
export function groupRowsByDay(rows: readonly LedgerRow[]): LedgerDay[] {
  const days = new Map<string, { date: Date; rows: LedgerRow[] }>()

  for (const row of rows) {
    const key = dayKey(row.date)
    const existing = days.get(key)
    if (existing === undefined) {
      days.set(key, { date: row.date, rows: [row] })
      continue
    }
    existing.rows.push(row)
  }

  return [...days.entries()].map(([key, day]) => ({
    key,
    date: day.date,
    rows: day.rows,
    netByCurrency: sumByAsset(day.rows.flatMap(currencyAmountsOf)),
  }))
}
