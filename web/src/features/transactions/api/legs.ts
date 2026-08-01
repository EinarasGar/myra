import type {
  RequiredIdentifiableTransaction,
  TransactionEntryWithRequiredEntryId,
} from "@/api"
import type {
  AnyTransactionTypeConfig,
  TransactionAmountKind,
  TransactionEntryPlacement,
} from "@/lib/domain/transaction-types"
import { TRANSACTION_TYPE_CONFIG } from "@/lib/domain/transaction-types"

import type { LegRole } from "./types"

export interface RawLeg {
  readonly entry: TransactionEntryWithRequiredEntryId
  readonly role: LegRole
  readonly placement: TransactionEntryPlacement
  readonly amountKind: TransactionAmountKind
  readonly label: string
}

type EntryRecord = Record<string, TransactionEntryWithRequiredEntryId>

/**
 * Which entries a type has, what they are called and which one leads is owned by
 * `@/lib/domain/transaction-types`; reading them from there keeps the ledger, the editor
 * and the validator describing the same transaction the same way.
 */
export function rawLegs(
  transaction: RequiredIdentifiableTransaction
): RawLeg[] {
  const config: AnyTransactionTypeConfig =
    TRANSACTION_TYPE_CONFIG[transaction.type]
  const entries = transaction as unknown as EntryRecord
  const legs: RawLeg[] = []

  for (const slot of config.entries) {
    const entry = entries[slot.field]
    if (entry === undefined) continue
    legs.push({
      entry,
      role: slot.field === config.primaryEntry ? "primary" : "counter",
      placement: slot.placement,
      amountKind: slot.amountKind,
      label: slot.label,
    })
  }

  return legs
}

export function transactionCategoryId(
  transaction: RequiredIdentifiableTransaction
): number | null {
  return transaction.type === "regular" ? transaction.category_id : null
}
