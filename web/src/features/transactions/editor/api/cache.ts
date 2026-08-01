import type { TransactionWithEntryIds } from "@/api"

import type { CachedItem, CachedTransaction } from "../../api/cache-shape"
import { isGroupItem, mapCachedTransactions } from "../../api/cache-shape"

/**
 * Rebuilt from the payload rather than spread over the old row: a type change leaves the
 * previous type's fields behind, and a half-merged row renders as neither type.
 */
function replaced(
  item: CachedTransaction,
  transaction: TransactionWithEntryIds
): CachedItem {
  const rebuilt: Record<string, unknown> = {
    ...(transaction as unknown as Record<string, unknown>),
    transaction_id: item.transaction_id,
  }
  if (item.item_type !== undefined) rebuilt.item_type = item.item_type
  if (item.visibility !== undefined) rebuilt.visibility = item.visibility
  return rebuilt as unknown as CachedItem
}

export function replaceTransactionInCache(
  data: unknown,
  transactionId: string,
  transaction: TransactionWithEntryIds
): unknown {
  return mapCachedTransactions(data, (item) => {
    if (isGroupItem(item)) {
      return {
        ...item,
        transactions: item.transactions.map((child) =>
          child.transaction_id === transactionId
            ? (replaced(child, transaction) as CachedTransaction)
            : child
        ),
      }
    }
    return item.transaction_id === transactionId
      ? replaced(item, transaction)
      : item
  })
}
