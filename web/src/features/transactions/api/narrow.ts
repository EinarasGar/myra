import type {
  CombinedTransactionItem,
  GroupTransactionItem,
  RequiredIdentifiableTransaction,
} from "@/api"
import { isTransactionTypeTag } from "@/lib/domain/transaction-types"

export function isGroupItem(
  item: CombinedTransactionItem
): item is GroupTransactionItem {
  return item.item_type === "group"
}

/**
 * `api.ts` is `@ts-nocheck`ed, so `IndividualTransactionItem` silently loses the
 * transaction union it declares it extends. This is the one place that reconstructs it,
 * behind a runtime check on the type tag, rather than the six scattered
 * `as unknown as` casts web_old needed.
 */
export function asTransaction(
  item: CombinedTransactionItem
): RequiredIdentifiableTransaction | null {
  if (isGroupItem(item)) return null
  const tag: unknown = (item as { type?: unknown }).type
  if (!isTransactionTypeTag(tag)) return null
  return item as unknown as RequiredIdentifiableTransaction
}
