import type { TransactionInput } from "@/api"
import type { TransactionTypeTag } from "@/lib/domain/transaction-types"
import { validateTransactionInputOfType } from "@/lib/domain/transaction-types"
import { toFormErrors } from "@/lib/errors"

import { buildCandidate } from "./candidate"
import type { EditorDraft } from "./draft"
import { isBlankAmount, magnitudeOf, signedAmountOf } from "./draft"
import type { EditorTypeView } from "./layout"

export const MISSING_ACCOUNT = "Pick an account."
export const MISSING_ASSET = "Pick an asset."
export const MISSING_AMOUNT = "Enter an amount."
export const UNREADABLE_AMOUNT = "That is not a number."
export const MISSING_CATEGORY = "Pick a category."
export const MISSING_DATE = "Pick a date."

export type EditorFieldErrors = Readonly<Record<string, readonly string[]>>

export interface EditorValidation {
  readonly ok: boolean
  readonly value: TransactionInput | null
  readonly fieldErrors: EditorFieldErrors
  readonly formErrors: readonly string[]
}

function add(
  target: Record<string, string[]>,
  field: string,
  message: string
): void {
  const bucket = target[field]
  if (bucket === undefined) target[field] = [message]
  else if (!bucket.includes(message)) bucket.push(message)
}

/**
 * Runs ahead of the schema so an untouched control says "Pick an account." rather than
 * the type error a missing value would otherwise produce.
 */
export function missingFieldErrors(
  view: EditorTypeView,
  draft: EditorDraft
): Record<string, string[]> {
  const errors: Record<string, string[]> = {}

  if (draft.date === null) add(errors, "date", MISSING_DATE)
  if (view.showsCategory && draft.categoryId === null) {
    add(errors, "category_id", MISSING_CATEGORY)
  }
  if (view.showsOriginAsset && draft.originAssetId === null) {
    add(errors, "origin_asset_id", MISSING_ASSET)
  }

  for (const slot of view.slots) {
    const entry = draft.slots[slot.key]
    const field = slot.shape.field
    if (entry.accountId === null)
      add(errors, `${field}.account_id`, MISSING_ACCOUNT)
    if (entry.assetId === null) add(errors, `${field}.asset_id`, MISSING_ASSET)
    if (signedAmountOf(slot.shape, entry) === undefined) {
      add(
        errors,
        `${field}.amount`,
        isBlankAmount(entry) ? MISSING_AMOUNT : UNREADABLE_AMOUNT
      )
    }
  }

  draft.fees.forEach((fee, index) => {
    if (fee.accountId === null) {
      add(errors, `fees[${String(index)}].account_id`, MISSING_ACCOUNT)
    }
    if (fee.assetId === null) {
      add(errors, `fees[${String(index)}].asset_id`, MISSING_ASSET)
    }
    if (magnitudeOf(fee) === null) {
      add(
        errors,
        `fees[${String(index)}].amount`,
        isBlankAmount(fee) ? MISSING_AMOUNT : UNREADABLE_AMOUNT
      )
    }
  })

  return errors
}

export function validateDraft(
  view: EditorTypeView,
  draft: EditorDraft
): EditorValidation {
  const type: TransactionTypeTag = view.type
  const missing = missingFieldErrors(view, draft)
  const result = validateTransactionInputOfType(
    type,
    buildCandidate(type, draft)
  )

  if (result.ok && Object.keys(missing).length === 0) {
    return { ok: true, value: result.value, fieldErrors: {}, formErrors: [] }
  }

  const fieldErrors: Record<string, string[]> = { ...missing }
  if (!result.ok) {
    for (const issue of result.issues) {
      if (missing[issue.field] !== undefined) continue
      add(fieldErrors, issue.field, issue.message)
    }
  }

  return { ok: false, value: null, fieldErrors, formErrors: [] }
}

export interface ServerErrors {
  readonly fieldErrors: EditorFieldErrors
  readonly formErrors: readonly string[]
}

export const SHAPE_REJECTED =
  "Sverto refused this transaction and cannot say which field is wrong. Nothing was saved. Check the amounts, accounts and assets, then try again."

/**
 * Server field paths are the same strings the client schema produces, so they attach to
 * the same inputs. The two form-level cases — a `body`/`transaction` blob and a
 * ValidationError with no field errors at all — become a banner instead of vanishing.
 */
export function serverErrors(error: unknown): ServerErrors {
  if (error === null || error === undefined) {
    return { fieldErrors: {}, formErrors: [] }
  }
  const form = toFormErrors(error, {
    fieldMessages: { transaction: SHAPE_REJECTED },
  })
  return { fieldErrors: form.fieldErrors, formErrors: form.formErrors }
}

export interface PartitionedServerErrors {
  readonly fieldErrors: EditorFieldErrors
  readonly messages: readonly string[]
}

export interface RenderedFields {
  readonly roots: readonly string[]
  readonly feeCount: number
}

const FEE_PATH = /^fees\[(\d+)]/

function isAttachable(field: string, rendered: RenderedFields): boolean {
  const fee = FEE_PATH.exec(field)
  if (fee !== null) return Number(fee[1]) < rendered.feeCount
  const root = field.split(/[.[]/)[0] ?? field
  return root !== "fees" && rendered.roots.includes(root)
}

/**
 * The server can name a field the current type does not put on screen, and a message with
 * nowhere to attach used to vanish — the save then looked like it did nothing at all.
 * Anything unattachable is promoted to the form-level banner instead.
 */
export function orphanServerErrors(
  fieldErrors: EditorFieldErrors,
  rendered: RenderedFields
): PartitionedServerErrors {
  const attached: Record<string, string[]> = {}
  const messages: string[] = []

  for (const [field, fieldMessages] of Object.entries(fieldErrors)) {
    if (isAttachable(field, rendered)) {
      attached[field] = [...fieldMessages]
      continue
    }
    for (const message of fieldMessages) {
      if (!messages.includes(message)) messages.push(message)
    }
  }

  return { fieldErrors: attached, messages }
}

export function mergeFieldErrors(
  ...sources: readonly EditorFieldErrors[]
): EditorFieldErrors {
  const merged: Record<string, string[]> = {}
  for (const source of sources) {
    for (const [field, messages] of Object.entries(source)) {
      for (const message of messages) add(merged, field, message)
    }
  }
  return merged
}
