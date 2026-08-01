import type { GroupTransactionItem } from "@/api"

import type { LedgerGroupRow } from "../api"

import { formatEditorDate, parseEditorDate } from "./date-input"
import {
  CATEGORY_REQUIRED,
  DATE_REQUIRED,
  DATE_UNREADABLE,
  DESCRIPTION_REQUIRED,
  DESCRIPTION_TOO_LONG,
  GROUP_DESCRIPTION_MAX,
} from "./group-copy"

export interface GroupEditorDraft {
  readonly description: string
  readonly dateText: string
  readonly date: number | null
  readonly categoryId: number | null
}

export type GroupEditorField = "description" | "date" | "category"

export type GroupEditorErrors = Partial<Record<GroupEditorField, string>>

export function groupEditorDraft(group: LedgerGroupRow): GroupEditorDraft {
  return {
    description: group.raw.description,
    dateText: formatEditorDate(group.raw.date),
    date: group.raw.date,
    categoryId: group.raw.category_id,
  }
}

export function withGroupDate(
  draft: GroupEditorDraft,
  dateText: string,
  now: Date
): GroupEditorDraft {
  return { ...draft, dateText, date: parseEditorDate(dateText, now).date }
}

export function groupEditorErrors(draft: GroupEditorDraft): GroupEditorErrors {
  const errors: GroupEditorErrors = {}
  const description = draft.description.trim()

  if (description === "") errors.description = DESCRIPTION_REQUIRED
  else if (description.length > GROUP_DESCRIPTION_MAX)
    errors.description = DESCRIPTION_TOO_LONG

  if (draft.dateText.trim() === "") errors.date = DATE_REQUIRED
  else if (draft.date === null) errors.date = DATE_UNREADABLE

  if (draft.categoryId === null) errors.category = CATEGORY_REQUIRED

  return errors
}

export function isGroupEditorDraftValid(draft: GroupEditorDraft): boolean {
  return Object.keys(groupEditorErrors(draft)).length === 0
}

export function isGroupEditorDraftDirty(
  group: LedgerGroupRow,
  draft: GroupEditorDraft
): boolean {
  return (
    draft.description !== group.raw.description ||
    draft.date !== group.raw.date ||
    draft.categoryId !== group.raw.category_id
  )
}

/**
 * `PUT /transactions/groups/{id}` takes the whole group and deletes any member its
 * `transactions` array omits, so the children are carried across by reference: the editor
 * has no control that could change one, and passing the same array makes that checkable.
 */
export function editedGroup(
  group: LedgerGroupRow,
  draft: GroupEditorDraft
): GroupTransactionItem | null {
  if (!isGroupEditorDraftValid(draft)) return null
  if (draft.date === null || draft.categoryId === null) return null
  return {
    ...group.raw,
    description: draft.description.trim(),
    date: draft.date,
    category_id: draft.categoryId,
    transactions: group.raw.transactions,
  }
}
