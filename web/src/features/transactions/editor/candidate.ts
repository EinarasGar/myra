import type { TransactionInput, TransactionWithEntryIds } from "@/api"
import type {
  AnyTransactionTypeConfig,
  TransactionEntryField,
  TransactionTypeTag,
} from "@/lib/domain/transaction-types"
import { TRANSACTION_TYPE_CONFIG } from "@/lib/domain/transaction-types"

import type { EditorDraft } from "./draft"
import {
  emptyDraft,
  magnitudeOf,
  signedAmountOf,
  slotKeyOfField,
  slotShapeFor,
} from "./draft"

type WireInput<T extends TransactionTypeTag> = Extract<
  TransactionInput,
  { type: T }
>

type WireWithEntryIds<T extends TransactionTypeTag> = Extract<
  TransactionWithEntryIds,
  { type: T }
>

/**
 * Every wire field of a type, with the leaves widened to `unknown` so a half-filled draft
 * can be assembled before it is valid. Required keys are what carries the guarantee: a
 * type whose payload gains a field, or a fourteenth type, cannot be assembled until this
 * module names it.
 */
export type TransactionCandidate<T extends TransactionTypeTag> = {
  readonly [K in keyof WireInput<T>]-?: K extends "type" ? T : unknown
}

type SameKeys<A, B> = [keyof A] extends [keyof B]
  ? [keyof B] extends [keyof A]
    ? true
    : false
  : false

type AllTrue<T extends Record<string, true>> = T

/**
 * The update payload reuses the create candidate with `entry_id` added to each entry.
 * That is only sound while the two wire shapes carry the same field names, which this
 * asserts per type at compile time.
 */
export type EntryIdKeyParity = AllTrue<{
  [T in TransactionTypeTag]: SameKeys<WireInput<T>, WireWithEntryIds<T>>
}>

interface CandidateContext<T extends TransactionTypeTag> {
  readonly date: unknown
  readonly fees: unknown
  readonly category_id: unknown
  readonly description: unknown
  readonly origin_asset_id: unknown
  entry: (field: TransactionEntryField<T>) => unknown
}

type Assembler<T extends TransactionTypeTag> = (
  context: CandidateContext<T>
) => TransactionCandidate<T>

const ASSEMBLERS: { [T in TransactionTypeTag]: Assembler<T> } = {
  regular: (c) => ({
    type: "regular",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
    category_id: c.category_id,
    description: c.description,
  }),
  account_fees: (c) => ({
    type: "account_fees",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
  }),
  cash_transfer_in: (c) => ({
    type: "cash_transfer_in",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
  }),
  cash_transfer_out: (c) => ({
    type: "cash_transfer_out",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
  }),
  cash_balance_transfer: (c) => ({
    type: "cash_balance_transfer",
    date: c.date,
    fees: c.fees,
    outgoing_change: c.entry("outgoing_change"),
    incoming_change: c.entry("incoming_change"),
  }),
  asset_transfer_in: (c) => ({
    type: "asset_transfer_in",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
  }),
  asset_transfer_out: (c) => ({
    type: "asset_transfer_out",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
  }),
  asset_balance_transfer: (c) => ({
    type: "asset_balance_transfer",
    date: c.date,
    fees: c.fees,
    outgoing_change: c.entry("outgoing_change"),
    incoming_change: c.entry("incoming_change"),
  }),
  asset_purchase: (c) => ({
    type: "asset_purchase",
    date: c.date,
    fees: c.fees,
    purchase_change: c.entry("purchase_change"),
    cash_outgoings_change: c.entry("cash_outgoings_change"),
  }),
  asset_sale: (c) => ({
    type: "asset_sale",
    date: c.date,
    fees: c.fees,
    sale_entry: c.entry("sale_entry"),
    proceeds_entry: c.entry("proceeds_entry"),
  }),
  asset_trade: (c) => ({
    type: "asset_trade",
    date: c.date,
    fees: c.fees,
    outgoing_entry: c.entry("outgoing_entry"),
    incoming_entry: c.entry("incoming_entry"),
  }),
  cash_dividend: (c) => ({
    type: "cash_dividend",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
    origin_asset_id: c.origin_asset_id,
  }),
  asset_dividend: (c) => ({
    type: "asset_dividend",
    date: c.date,
    fees: c.fees,
    entry: c.entry("entry"),
  }),
}

export interface CandidateOptions {
  readonly withEntryIds: boolean
}

function trimmedDescription(draft: EditorDraft): string | undefined {
  const trimmed = draft.description.trim()
  return trimmed === "" ? undefined : trimmed
}

function feeValues(draft: EditorDraft, options: CandidateOptions): unknown[] {
  return draft.fees.map((fee) => {
    const magnitude = magnitudeOf(fee)
    const base = {
      account_id: fee.accountId ?? undefined,
      asset_id: fee.assetId ?? undefined,
      amount: magnitude === null ? undefined : -magnitude,
      fee_type: fee.feeType,
    }
    return options.withEntryIds ? { ...base, entry_id: fee.entryId } : base
  })
}

function entryValue(
  draft: EditorDraft,
  config: AnyTransactionTypeConfig,
  field: string,
  options: CandidateOptions
): unknown {
  const key = slotKeyOfField(config, field)
  const shape = slotShapeFor(config, key)
  const entry = draft.slots[key]
  const base = {
    account_id: entry.accountId ?? undefined,
    asset_id: entry.assetId ?? undefined,
    amount: shape === null ? undefined : signedAmountOf(shape, entry),
  }
  return options.withEntryIds ? { ...base, entry_id: entry.entryId } : base
}

export function buildCandidate<T extends TransactionTypeTag>(
  type: T,
  draft: EditorDraft,
  options: CandidateOptions = { withEntryIds: false }
): TransactionCandidate<T> {
  const config: AnyTransactionTypeConfig = TRANSACTION_TYPE_CONFIG[type]
  const assemble: Assembler<T> = ASSEMBLERS[type]
  return assemble({
    date: draft.date ?? undefined,
    fees: draft.fees.length === 0 ? undefined : feeValues(draft, options),
    category_id: draft.categoryId ?? undefined,
    description: trimmedDescription(draft),
    origin_asset_id: draft.originAssetId ?? undefined,
    entry: (field) => entryValue(draft, config, String(field), options),
  })
}

export function candidateFieldNames(type: TransactionTypeTag): string[] {
  const draft = emptyDraft({ date: 0, dateText: "", type })
  return Object.keys(buildCandidate(type, draft)).sort((a, b) =>
    a.localeCompare(b)
  )
}

/**
 * SAFETY: the candidate carries exactly the wire field names of `type` (enforced by
 * `TransactionCandidate`) and, with `withEntryIds`, an `entry_id` on every entry and fee.
 * `EntryIdKeyParity` asserts the two payload shapes share those field names per type.
 */
export function buildUpdatePayload(
  type: TransactionTypeTag,
  draft: EditorDraft
): TransactionWithEntryIds {
  return buildCandidate(type, draft, {
    withEntryIds: true,
  }) as unknown as TransactionWithEntryIds
}
