import type {
  AccountIdentifier,
  AccountIdentifierKind,
  UpdateAccount,
} from "@/api"
import { AccountIdentifierKind as IdentifierKind } from "@/api"
import { interpretFieldMessage, normalizeError } from "@/lib/errors"

import type { AccountDetail } from "./api"

const ACCOUNT_NAME_MAX_LENGTH = 200

export const IDENTIFIER_KINDS = [
  IdentifierKind.CardLast4,
  IdentifierKind.AccountNumber,
  IdentifierKind.Iban,
] as const

export const IDENTIFIER_KIND_LABELS: Record<AccountIdentifierKind, string> = {
  card_last4: "Card ending",
  account_number: "Account number",
  iban: "IBAN",
}

export const IDENTIFIER_KIND_PLACEHOLDERS: Record<
  AccountIdentifierKind,
  string
> = {
  card_last4: "4291",
  account_number: "12345678",
  iban: "GB29 NWBK 6016 1331 9268 19",
}

export const NAME_REQUIRED = "Give the account a name."
const NAME_TOO_LONG = "Must be between 1 and 200 characters."
const TYPE_REQUIRED = "Pick an account type."
const LIQUIDITY_REQUIRED = "Pick a liquidity type."
export const SHARE_REQUIRED = "Enter a percentage — 100 if it is all yours."
export const SHARE_UNREADABLE = "That is not a percentage."
export const SHARE_TOO_LOW = "A share has to be more than 0%."
export const SHARE_TOO_HIGH = "A share cannot be more than 100%."
const IDENTIFIER_REQUIRED = "Enter a value or remove this row."
const IDENTIFIER_DUPLICATE = "Duplicate identifier."

const IDENTIFIER_MESSAGES: Record<AccountIdentifierKind, string> = {
  card_last4: "Card last 4 must be exactly 4 digits.",
  account_number: "Account number must be 4–34 digits.",
  iban: "IBAN must be 15–34 chars: 2 letters, 2 digits, then letters/digits.",
}

export interface IdentifierDraft {
  readonly key: string
  readonly kind: AccountIdentifierKind
  readonly value: string
}

export interface AccountFormState {
  readonly name: string
  readonly accountTypeId: number | null
  readonly liquidityTypeId: number | null
  readonly sharePercent: string
  readonly identifiers: readonly IdentifierDraft[]
}

export type AccountFieldErrors = Readonly<Record<string, readonly string[]>>

export interface AccountFormValidation {
  readonly ok: boolean
  readonly payload: UpdateAccount | null
  readonly fieldErrors: AccountFieldErrors
}

export interface AccountServerErrors {
  readonly fieldErrors: AccountFieldErrors
  readonly formErrors: readonly string[]
}

let identifierSeq = 0

export function identifierKey(): string {
  identifierSeq += 1
  return `identifier-${String(identifierSeq)}`
}

export function newIdentifierDraft(
  kind: AccountIdentifierKind = IdentifierKind.CardLast4
): IdentifierDraft {
  return { key: identifierKey(), kind, value: "" }
}

export function normaliseIdentifierValue(
  kind: AccountIdentifierKind,
  raw: string
): string {
  if (kind === IdentifierKind.CardLast4) return raw.trim()
  if (kind === IdentifierKind.AccountNumber) return raw.replace(/\D/g, "")
  return raw.replace(/\s/g, "").toUpperCase()
}

export function identifierValueError(
  kind: AccountIdentifierKind,
  value: string
): string | null {
  if (value === "") return IDENTIFIER_REQUIRED
  if (kind === IdentifierKind.CardLast4) {
    return /^\d{4}$/.test(value) ? null : IDENTIFIER_MESSAGES.card_last4
  }
  if (kind === IdentifierKind.AccountNumber) {
    return /^\d{4,34}$/.test(value) ? null : IDENTIFIER_MESSAGES.account_number
  }
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)
    ? null
    : IDENTIFIER_MESSAGES.iban
}

export interface SharePercentParse {
  readonly percent: number | null
  readonly error: string | null
}

export function parseSharePercent(raw: string): SharePercentParse {
  const cleaned = raw.trim().replace(/%$/, "").replace(",", ".").trim()
  if (cleaned === "") return { percent: null, error: SHARE_REQUIRED }
  if (!/^\d*\.?\d*$/.test(cleaned)) {
    return { percent: null, error: SHARE_UNREADABLE }
  }
  const percent = Number(cleaned)
  if (!Number.isFinite(percent)) {
    return { percent: null, error: SHARE_UNREADABLE }
  }
  if (percent <= 0) return { percent: null, error: SHARE_TOO_LOW }
  if (percent > 100) return { percent: null, error: SHARE_TOO_HIGH }
  return { percent, error: null }
}

/** Six decimals keeps 33.3% at 0.333 rather than 0.33299999999999996. */
export function sharePercentToFraction(percent: number): number {
  return Number((percent / 100).toFixed(6))
}

export function formatSharePercent(fraction: number): string {
  return String(Number((fraction * 100).toFixed(4)))
}

export function emptyAccountForm(defaults: {
  accountTypeId?: number | null
  liquidityTypeId?: number | null
}): AccountFormState {
  return {
    name: "",
    accountTypeId: defaults.accountTypeId ?? null,
    liquidityTypeId: defaults.liquidityTypeId ?? null,
    sharePercent: "100",
    identifiers: [],
  }
}

export function accountFormFromDetail(detail: AccountDetail): AccountFormState {
  return {
    name: detail.name,
    accountTypeId: detail.accountTypeId,
    liquidityTypeId: detail.liquidityTypeId,
    sharePercent: formatSharePercent(detail.ownershipShare),
    identifiers: detail.identifiers.map((identifier) => ({
      key: identifierKey(),
      kind: identifier.kind,
      value: identifier.value,
    })),
  }
}

function push(
  target: Record<string, string[]>,
  field: string,
  message: string
): void {
  const bucket = target[field]
  if (bucket === undefined) target[field] = [message]
  else if (!bucket.includes(message)) bucket.push(message)
}

export function validateAccountForm(
  state: AccountFormState
): AccountFormValidation {
  const fieldErrors: Record<string, string[]> = {}

  const name = state.name.trim()
  if (name === "") push(fieldErrors, "name", NAME_REQUIRED)
  else if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
    push(fieldErrors, "name", NAME_TOO_LONG)
  }

  if (state.accountTypeId === null)
    push(fieldErrors, "account_type", TYPE_REQUIRED)
  if (state.liquidityTypeId === null) {
    push(fieldErrors, "liquidity_type", LIQUIDITY_REQUIRED)
  }

  const share = parseSharePercent(state.sharePercent)
  if (share.error !== null) push(fieldErrors, "ownership_share", share.error)

  const identifiers: AccountIdentifier[] = []
  const seen = new Set<string>()
  state.identifiers.forEach((draft, index) => {
    const value = normaliseIdentifierValue(draft.kind, draft.value)
    const error = identifierValueError(draft.kind, value)
    if (error !== null) {
      push(fieldErrors, `identifiers[${String(index)}].value`, error)
      return
    }
    const fingerprint = `${draft.kind}:${value}`
    if (seen.has(fingerprint)) {
      push(fieldErrors, `identifiers[${String(index)}]`, IDENTIFIER_DUPLICATE)
      return
    }
    seen.add(fingerprint)
    identifiers.push({ kind: draft.kind, value })
  })

  const ok = Object.keys(fieldErrors).length === 0
  if (
    !ok ||
    state.accountTypeId === null ||
    state.liquidityTypeId === null ||
    share.percent === null
  ) {
    return { ok: false, payload: null, fieldErrors }
  }

  return {
    ok: true,
    payload: {
      name,
      account_type: state.accountTypeId,
      liquidity_type: state.liquidityTypeId,
      ownership_share: sharePercentToFraction(share.percent),
      identifiers,
    },
    fieldErrors: {},
  }
}

const FORM_LEVEL_FIELDS = new Set(["query", "transaction"])

/**
 * `AddAccountRequestViewModel` flattens the name into the body, so a rejected name comes
 * back as `field: "body"` with the field name already destroyed by serde. The only other
 * flattened member is the account-type id, which this form can only ever send from the
 * server's own list — so a readable `body` message belongs on the name input.
 */
export function accountServerErrors(error: unknown): AccountServerErrors {
  const normalized = normalizeError(error)
  if (normalized.kind !== "validation" || normalized.fieldErrors.length === 0) {
    return { fieldErrors: {}, formErrors: [normalized.message] }
  }

  const fieldErrors: Record<string, string[]> = {}
  const formErrors: string[] = []

  for (const fieldError of normalized.fieldErrors) {
    const interpreted = interpretFieldMessage(fieldError.message)
    const field =
      fieldError.field === "body" && interpreted.presentable
        ? "name"
        : fieldError.field

    if (field === "body" || FORM_LEVEL_FIELDS.has(field)) {
      if (!formErrors.includes(interpreted.message)) {
        formErrors.push(interpreted.message)
      }
      continue
    }
    push(fieldErrors, field, interpreted.message)
  }

  return { fieldErrors, formErrors }
}

export function mergeFieldErrors(
  ...sources: readonly AccountFieldErrors[]
): AccountFieldErrors {
  const merged: Record<string, string[]> = {}
  for (const source of sources) {
    for (const [field, messages] of Object.entries(source)) {
      for (const message of messages) push(merged, field, message)
    }
  }
  return merged
}

export function identifierRowErrors(
  errors: AccountFieldErrors,
  index: number
): readonly string[] {
  return [
    ...(errors[`identifiers[${String(index)}].value`] ?? []),
    ...(errors[`identifiers[${String(index)}]`] ?? []),
  ]
}
