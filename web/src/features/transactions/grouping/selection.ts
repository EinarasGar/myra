import type { LedgerGroupRow, LedgerRow, LedgerTransactionRow } from "../api"
import { isGroupRow } from "../api"

export const NEEDS_TWO =
  "Grouping needs at least two transactions — or one group, to add the rest to."

export const ONE_GROUP_AT_A_TIME =
  "Only one group at a time can take transactions in. Deselect the others."

export const GROUP_NEEDS_MEMBERS =
  "Select the transactions to move into this group as well."

export type GroupingAction =
  | { readonly kind: "none"; readonly reason: string | null }
  | {
      readonly kind: "create"
      readonly label: string
      readonly members: readonly LedgerTransactionRow[]
    }
  | {
      readonly kind: "add"
      readonly label: string
      readonly group: LedgerGroupRow
      readonly members: readonly LedgerTransactionRow[]
    }

/**
 * Only top-level rows can be selected, so every transaction in a selection is one that is not
 * already in a group — which is exactly what both endpoints accept.
 */
export function groupingActionFor(rows: readonly LedgerRow[]): GroupingAction {
  const groups = rows.filter((row): row is LedgerGroupRow => isGroupRow(row))
  const members = rows.filter(
    (row): row is LedgerTransactionRow => !isGroupRow(row)
  )

  if (rows.length === 0) return { kind: "none", reason: null }
  if (groups.length > 1) {
    return { kind: "none", reason: ONE_GROUP_AT_A_TIME }
  }

  const target = groups[0]
  if (target !== undefined) {
    if (members.length === 0) {
      return { kind: "none", reason: GROUP_NEEDS_MEMBERS }
    }
    return {
      kind: "add",
      label: `Add ${String(members.length)} to group`,
      group: target,
      members,
    }
  }

  if (members.length < 2) return { kind: "none", reason: NEEDS_TWO }

  return {
    kind: "create",
    label: `Group these ${String(members.length)}`,
    members,
  }
}
