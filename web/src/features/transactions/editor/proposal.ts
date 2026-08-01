import type { MockId } from "@/lib/mock"
import {
  MOCK_EDITOR_PROPOSAL,
  MOCK_EDITOR_PROPOSAL_COMPOSER_REFUSAL,
} from "@/lib/mock"
import { isTransactionTypeTag } from "@/lib/domain/transaction-types"
import type { TransactionTypeTag } from "@/lib/domain/transaction-types"

import type { EditorDraft } from "./draft"
import {
  amountTextOf,
  EDITOR_SLOT_KEYS,
  emptyDraft,
  setSlot,
  withType,
} from "./draft"

export type ProvenanceMark =
  | { readonly kind: "filled" }
  | { readonly kind: "corrected"; readonly previousLabel: string | null }

export interface EditorProposal {
  readonly id: string
  readonly type: TransactionTypeTag
  readonly intro: string
  readonly draft: EditorDraft
  readonly filledFields: readonly string[]
  readonly transcript: readonly {
    readonly key: string
    readonly role: "user" | "myra" | "system"
    readonly text: string
  }[]
  readonly composerRefusal: string
  readonly mockId: MockId
}

export const EDITOR_PROPOSAL_MOCK_ID: MockId = "editors.myra-proposal"

/**
 * The proposal is invented; the marks the editor draws from it are not. `filledFields`
 * only says which fields arrived pre-filled — whether one is still Myra's answer or has
 * been corrected is decided by comparing the live draft against this one.
 */
export function editorProposal(input: {
  date: number
  dateText: string
  accountId: string | null
  assetId: number | null
  categoryId: number | null
}): EditorProposal {
  const type = isTransactionTypeTag(MOCK_EDITOR_PROPOSAL.type)
    ? MOCK_EDITOR_PROPOSAL.type
    : "regular"

  const base = withType(
    emptyDraft({ date: input.date, dateText: input.dateText }),
    type
  )
  const draft: EditorDraft = {
    ...setSlot(base, "primary", {
      accountId: input.accountId,
      assetId: input.assetId,
      amountText: amountTextOf(MOCK_EDITOR_PROPOSAL.amount),
      flow: "out",
    }),
    categoryId: input.categoryId,
    description: MOCK_EDITOR_PROPOSAL.description,
  }

  return {
    id: MOCK_EDITOR_PROPOSAL.id,
    type,
    intro: MOCK_EDITOR_PROPOSAL.intro,
    draft,
    filledFields: MOCK_EDITOR_PROPOSAL.filled.map((field) => field.field),
    transcript: MOCK_EDITOR_PROPOSAL.transcript,
    composerRefusal: MOCK_EDITOR_PROPOSAL_COMPOSER_REFUSAL,
    mockId: EDITOR_PROPOSAL_MOCK_ID,
  }
}

export interface ProvenanceValueContext {
  readonly slotField: (key: "primary" | "counter") => string | null
  readonly accountName: (accountId: string | null) => string | null
  readonly categoryName: (categoryId: number | null) => string | null
  readonly dateLabel: (date: number | null) => string | null
}

/**
 * One string per field path, so "did the user change what Myra proposed" is a comparison
 * of what is on screen rather than a flag the editor has to remember to set.
 */
export function provenanceValues(
  draft: EditorDraft,
  context: ProvenanceValueContext
): Record<string, string | null> {
  const values: Record<string, string | null> = {
    category_id: context.categoryName(draft.categoryId),
    description: draft.description.trim() === "" ? null : draft.description,
    date: context.dateLabel(draft.date),
    origin_asset_id:
      draft.originAssetId === null ? null : String(draft.originAssetId),
  }

  for (const key of EDITOR_SLOT_KEYS) {
    const field = context.slotField(key)
    if (field === null) continue
    const entry = draft.slots[key]
    values[`${field}.amount`] =
      entry.amountText.trim() === "" ? null : entry.amountText
    values[`${field}.account_id`] = context.accountName(entry.accountId)
    values[`${field}.asset_id`] =
      entry.assetId === null ? null : String(entry.assetId)
  }

  return values
}

export interface ProvenanceLookup {
  readonly mark: (field: string) => ProvenanceMark | null
  readonly correctedCount: number
}

export const NO_PROVENANCE: ProvenanceLookup = {
  mark: () => null,
  correctedCount: 0,
}

export function provenanceFor(input: {
  proposal: EditorProposal | null
  values: Readonly<Record<string, string | null>>
  proposedValues: Readonly<Record<string, string | null>>
}): ProvenanceLookup {
  const { proposal } = input
  if (proposal === null) return NO_PROVENANCE

  const marks = new Map<string, ProvenanceMark>()
  for (const field of proposal.filledFields) {
    const proposed = input.proposedValues[field] ?? null
    const current = input.values[field] ?? null
    marks.set(
      field,
      current === proposed
        ? { kind: "filled" }
        : { kind: "corrected", previousLabel: proposed }
    )
  }

  let correctedCount = 0
  for (const mark of marks.values()) {
    if (mark.kind === "corrected") correctedCount += 1
  }

  return {
    mark: (field) => marks.get(field) ?? null,
    correctedCount,
  }
}
