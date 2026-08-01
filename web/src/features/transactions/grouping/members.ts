import type { GroupTransactionItem } from "@/api"

import type { LedgerGroupRow, LedgerTransactionRow } from "../api"
import { transactionCategoryId } from "../api"
import { formatEditorDate, parseEditorDate } from "../editor"

import {
  CATEGORY_REQUIRED,
  DATE_REQUIRED,
  DATE_UNREADABLE,
  DESCRIPTION_REQUIRED,
  DESCRIPTION_TOO_LONG,
  MEMBERS_NONE_ADDED,
  MEMBERS_TOO_FEW,
} from "./copy"

export const DESCRIPTION_MAX = 500

export type GroupComposerMode = "create" | "add"

export interface GroupDraft {
  readonly description: string
  readonly dateText: string
  readonly date: number | null
  readonly categoryId: number | null
  readonly members: readonly LedgerTransactionRow[]
}

export type GroupDraftField = "description" | "date" | "category" | "members"

export type GroupDraftErrors = Partial<Record<GroupDraftField, string>>

function latestDate(members: readonly LedgerTransactionRow[]): number | null {
  let latest: number | null = null
  for (const member of members) {
    const seconds = member.raw.date
    if (latest === null || seconds > latest) latest = seconds
  }
  return latest
}

function sharedDescription(members: readonly LedgerTransactionRow[]): string {
  const first = members[0]
  if (first === undefined) return ""
  const shared = first.description.primary
  return members.every((member) => member.description.primary === shared)
    ? shared
    : ""
}

/**
 * Read off the transaction rather than the resolved category, so a member whose category is
 * missing from the page's lookup tables still counts against the one the group inherits.
 */
function sharedCategory(
  members: readonly LedgerTransactionRow[]
): number | null {
  const ids = new Set<number>()
  for (const member of members) {
    const categoryId = transactionCategoryId(member.raw)
    if (categoryId !== null) ids.add(categoryId)
  }
  if (ids.size !== 1) return null
  const [only] = ids
  return only ?? null
}

/**
 * Every seed is read off the rows the user already picked — the latest of their dates, the
 * description they all share, the category they all share — so nothing in the form is a
 * value this app invented.
 */
export function seedGroupDraft(
  members: readonly LedgerTransactionRow[],
  now: Date
): GroupDraft {
  const date = latestDate(members) ?? parseEditorDate("today", now).date
  return {
    description: sharedDescription(members),
    dateText: date === null ? "" : formatEditorDate(date),
    date,
    categoryId: sharedCategory(members),
    members,
  }
}

export function seedAddDraft(
  group: LedgerGroupRow,
  members: readonly LedgerTransactionRow[]
): GroupDraft {
  return {
    description: group.raw.description,
    dateText: formatEditorDate(group.raw.date),
    date: group.raw.date,
    categoryId: group.raw.category_id,
    members,
  }
}

export function withMember(
  draft: GroupDraft,
  member: LedgerTransactionRow
): GroupDraft {
  if (draft.members.some((held) => held.transactionId === member.transactionId))
    return draft
  return { ...draft, members: [...draft.members, member] }
}

export function withoutMember(
  draft: GroupDraft,
  transactionId: string
): GroupDraft {
  return {
    ...draft,
    members: draft.members.filter(
      (member) => member.transactionId !== transactionId
    ),
  }
}

export function groupDraftErrors(
  draft: GroupDraft,
  mode: GroupComposerMode
): GroupDraftErrors {
  const errors: Record<string, string> = {}
  const description = draft.description.trim()

  if (description === "") errors.description = DESCRIPTION_REQUIRED
  else if (description.length > DESCRIPTION_MAX)
    errors.description = DESCRIPTION_TOO_LONG

  if (draft.dateText.trim() === "") errors.date = DATE_REQUIRED
  else if (draft.date === null) errors.date = DATE_UNREADABLE

  if (draft.categoryId === null) errors.category = CATEGORY_REQUIRED

  const minimum = mode === "create" ? 2 : 1
  if (draft.members.length < minimum) {
    errors.members = mode === "create" ? MEMBERS_TOO_FEW : MEMBERS_NONE_ADDED
  }

  return errors
}

export function isGroupDraftValid(
  draft: GroupDraft,
  mode: GroupComposerMode
): boolean {
  return Object.keys(groupDraftErrors(draft, mode)).length === 0
}

export interface ResolvedGroupDraft {
  readonly description: string
  readonly date: number
  readonly categoryId: number
  readonly members: readonly LedgerTransactionRow[]
}

export function resolveGroupDraft(
  draft: GroupDraft,
  mode: GroupComposerMode
): ResolvedGroupDraft | null {
  if (!isGroupDraftValid(draft, mode)) return null
  if (draft.date === null || draft.categoryId === null) return null
  return {
    description: draft.description.trim(),
    date: draft.date,
    categoryId: draft.categoryId,
    members: draft.members,
  }
}

/**
 * The whole membership the group should end up with. `PUT /transactions/groups/{id}` deletes
 * any current member the array omits, so the rows already in the group lead the list and the
 * additions follow.
 */
export function projectedGroup(
  group: LedgerGroupRow,
  resolved: ResolvedGroupDraft
): GroupTransactionItem {
  const held = new Set(
    group.raw.transactions.map((child) => child.transaction_id)
  )
  return {
    ...group.raw,
    description: resolved.description,
    date: resolved.date,
    category_id: resolved.categoryId,
    transactions: [
      ...group.raw.transactions,
      ...resolved.members
        .filter((member) => !held.has(member.transactionId))
        .map((member) => member.raw),
    ],
  }
}

export function addedMemberIds(
  group: LedgerGroupRow,
  resolved: ResolvedGroupDraft
): readonly string[] {
  const held = new Set(
    group.raw.transactions.map((child) => child.transaction_id)
  )
  return resolved.members
    .map((member) => member.transactionId)
    .filter((transactionId) => !held.has(transactionId))
}
