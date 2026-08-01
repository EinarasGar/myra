import type { TransactionVisibility } from "@/api"

import { isGroupItem, mapCachedTransactions } from "./cache-shape"

export function removeTransactionsFromCache(
  data: unknown,
  transactionIds: ReadonlySet<string>,
  groupIds: ReadonlySet<string>
): unknown {
  return mapCachedTransactions(data, (item) => {
    if (isGroupItem(item)) {
      if (groupIds.has(item.group_id)) return null
      const remaining = item.transactions.filter(
        (child) => !transactionIds.has(child.transaction_id)
      )
      if (remaining.length === item.transactions.length) return item
      if (remaining.length === 0) return null
      return { ...item, transactions: remaining }
    }
    return transactionIds.has(item.transaction_id) ? null : item
  })
}

export function setVisibilityInCache(
  data: unknown,
  transactionIds: ReadonlySet<string>,
  visibility: TransactionVisibility
): unknown {
  return mapCachedTransactions(data, (item) => {
    if (isGroupItem(item)) {
      return {
        ...item,
        transactions: item.transactions.map((child) =>
          transactionIds.has(child.transaction_id)
            ? { ...child, visibility }
            : child
        ),
      }
    }
    return transactionIds.has(item.transaction_id)
      ? { ...item, visibility }
      : item
  })
}
