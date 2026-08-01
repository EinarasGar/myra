import type { RequiredIdentifiableTransaction, TransactionFeeType } from "@/api"
import type {
  AnyTransactionTypeConfig,
  TransactionAmountKind,
  TransactionEntryPlacement,
  TransactionEntrySign,
  TransactionTypeTag,
} from "@/lib/domain/transaction-types"
import { TRANSACTION_TYPE_CONFIG } from "@/lib/domain/transaction-types"

import { rawLegs } from "../api"
import { moneyText, parseMoney } from "./money"

export type EditorSlotKey = "primary" | "counter"

export const EDITOR_SLOT_KEYS = ["primary", "counter"] as const

export type EditorFlow = "out" | "in"

export interface EditorSlotShape {
  readonly field: string
  readonly placement: TransactionEntryPlacement
  readonly sign: TransactionEntrySign
  readonly amountKind: TransactionAmountKind
  readonly label: string
  readonly accountLabel: string
}

export interface EditorEntryDraft {
  readonly accountId: string | null
  readonly assetId: number | null
  readonly amountText: string
  readonly flow: EditorFlow
  readonly entryId: number | null
}

export interface EditorFeeDraft {
  readonly key: string
  readonly accountId: string | null
  readonly assetId: number | null
  readonly amountText: string
  readonly feeType: TransactionFeeType
  readonly entryId: number | null
}

export interface EditorDraft {
  readonly type: TransactionTypeTag | null
  readonly date: number | null
  readonly dateText: string
  readonly slots: Readonly<Record<EditorSlotKey, EditorEntryDraft>>
  readonly categoryId: number | null
  readonly description: string
  readonly originAssetId: number | null
  readonly fees: readonly EditorFeeDraft[]
}

export const EMPTY_ENTRY_DRAFT: EditorEntryDraft = {
  accountId: null,
  assetId: null,
  amountText: "",
  flow: "out",
  entryId: null,
}

/**
 * The draft keeps the characters typed, not a number: "42." and "0.0" are states a user
 * passes through, and rounding them into a number and back would edit the field under them.
 */
export function magnitudeOf(input: { amountText: string }): number | null {
  const value = parseMoney(input.amountText)
  return value === null ? null : Math.abs(value)
}

export function isBlankAmount(input: { amountText: string }): boolean {
  return input.amountText.trim() === ""
}

export function amountTextOf(amount: number): string {
  return moneyText(Math.abs(amount))
}

export function slotShapes(
  config: AnyTransactionTypeConfig
): readonly EditorSlotShape[] {
  return config.entries
}

export function slotShapeFor(
  config: AnyTransactionTypeConfig,
  key: EditorSlotKey
): EditorSlotShape | null {
  const shapes = slotShapes(config)
  const primary = shapes.find((shape) => shape.field === config.primaryEntry)
  if (key === "primary") return primary ?? null
  return shapes.find((shape) => shape.field !== config.primaryEntry) ?? null
}

export function slotKeyOfField(
  config: AnyTransactionTypeConfig,
  field: string
): EditorSlotKey {
  return field === config.primaryEntry ? "primary" : "counter"
}

export function signedAmountOf(
  shape: EditorSlotShape,
  entry: EditorEntryDraft
): number | undefined {
  const magnitude = magnitudeOf(entry)
  if (magnitude === null) return undefined
  switch (shape.sign) {
    case "positive":
      return magnitude
    case "negative":
      return -magnitude
    case "nonZero":
      return entry.flow === "out" ? -magnitude : magnitude
  }
}

function flowForSign(
  sign: TransactionEntrySign,
  current: EditorFlow
): EditorFlow {
  switch (sign) {
    case "positive":
      return "in"
    case "negative":
      return "out"
    case "nonZero":
      return current
  }
}

function retarget(
  entry: EditorEntryDraft,
  shape: EditorSlotShape | null
): EditorEntryDraft {
  if (shape === null) return { ...entry, entryId: null }
  return {
    ...entry,
    entryId: null,
    flow: flowForSign(shape.sign, entry.flow),
  }
}

export function emptyDraft(input: {
  date: number
  dateText: string
  type?: TransactionTypeTag | null
}): EditorDraft {
  const draft: EditorDraft = {
    type: null,
    date: input.date,
    dateText: input.dateText,
    slots: { primary: EMPTY_ENTRY_DRAFT, counter: EMPTY_ENTRY_DRAFT },
    categoryId: null,
    description: "",
    originAssetId: null,
    fees: [],
  }
  const type = input.type ?? null
  return type === null ? draft : withType(draft, type)
}

/**
 * Switching type never discards a value: both slots survive in the draft even while the
 * new type renders only one of them, so switching back restores what was typed. Only the
 * entry ids are dropped — they identify rows of the shape being left behind.
 */
export function withType(
  draft: EditorDraft,
  type: TransactionTypeTag
): EditorDraft {
  if (draft.type === type) return draft
  const config: AnyTransactionTypeConfig = TRANSACTION_TYPE_CONFIG[type]
  return {
    ...draft,
    type,
    slots: {
      primary: retarget(draft.slots.primary, slotShapeFor(config, "primary")),
      counter: retarget(draft.slots.counter, slotShapeFor(config, "counter")),
    },
    fees: draft.fees.map((fee) => ({ ...fee, entryId: null })),
  }
}

export function setSlot(
  draft: EditorDraft,
  key: EditorSlotKey,
  patch: Partial<EditorEntryDraft>
): EditorDraft {
  return {
    ...draft,
    slots: { ...draft.slots, [key]: { ...draft.slots[key], ...patch } },
  }
}

export function mirrorSlot(
  draft: EditorDraft,
  patch: Partial<EditorEntryDraft>
): EditorDraft {
  return {
    ...draft,
    slots: {
      primary: { ...draft.slots.primary, ...patch },
      counter: { ...draft.slots.counter, ...patch },
    },
  }
}

/**
 * Everything that identifies *this* transaction goes; everything that describes the run
 * of them — type, accounts, assets, date — stays, because that is what "add another" means.
 */
export function clearedForNext(draft: EditorDraft): EditorDraft {
  return {
    ...draft,
    description: "",
    slots: {
      primary: { ...draft.slots.primary, amountText: "", entryId: null },
      counter: { ...draft.slots.counter, amountText: "", entryId: null },
    },
    fees: [],
  }
}

let feeKeySeed = 0

export function newFeeDraft(assetId: number | null): EditorFeeDraft {
  feeKeySeed += 1
  return {
    key: `fee-${String(feeKeySeed)}`,
    accountId: null,
    assetId,
    amountText: "",
    feeType: "transaction",
    entryId: null,
  }
}

function categoryIdOf(
  transaction: RequiredIdentifiableTransaction
): number | null {
  return transaction.type === "regular" ? transaction.category_id : null
}

function descriptionOf(transaction: RequiredIdentifiableTransaction): string {
  if (transaction.type !== "regular") return ""
  return transaction.description ?? ""
}

function originAssetIdOf(
  transaction: RequiredIdentifiableTransaction
): number | null {
  return transaction.type === "cash_dividend"
    ? transaction.origin_asset_id
    : null
}

export function draftFromTransaction(
  transaction: RequiredIdentifiableTransaction,
  dateText: string
): EditorDraft {
  const slots: Record<EditorSlotKey, EditorEntryDraft> = {
    primary: EMPTY_ENTRY_DRAFT,
    counter: EMPTY_ENTRY_DRAFT,
  }

  for (const leg of rawLegs(transaction)) {
    slots[leg.role] = {
      accountId: leg.entry.account_id,
      assetId: leg.entry.asset_id,
      amountText: amountTextOf(leg.entry.amount),
      flow: leg.entry.amount < 0 ? "out" : "in",
      entryId: leg.entry.entry_id,
    }
  }

  const fees = (transaction.fees ?? []).map((fee, index) => ({
    key: `fee-existing-${String(index)}`,
    accountId: fee.account_id,
    assetId: fee.asset_id,
    amountText: amountTextOf(fee.amount),
    feeType: fee.fee_type,
    entryId: fee.entry_id,
  }))

  return {
    type: transaction.type,
    date: transaction.date,
    dateText,
    slots,
    categoryId: categoryIdOf(transaction),
    description: descriptionOf(transaction),
    originAssetId: originAssetIdOf(transaction),
    fees,
  }
}
