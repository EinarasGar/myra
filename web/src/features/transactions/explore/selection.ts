import { useCallback, useMemo, useState } from "react"

import type { TransactionGroupId, TransactionId } from "@/lib/query"

import type {
  LedgerRow,
  VisibilityIntent,
  VisibilityPlan,
  VisibilitySubject,
} from "../api"
import { isGroupRow, planVisibility, refusedCount } from "../api"

export interface SelectionTargets {
  readonly rows: readonly LedgerRow[]
  readonly count: number
  readonly transactionIds: readonly TransactionId[]
  readonly groupIds: readonly TransactionGroupId[]
  readonly subjects: readonly VisibilitySubject[]
}

export function visibilitySubjects(
  rows: readonly LedgerRow[]
): VisibilitySubject[] {
  return rows.flatMap((row) =>
    (isGroupRow(row) ? row.children : [row]).map((child) => ({
      transactionId: child.transactionId,
      visibility: child.visibility,
    }))
  )
}

/**
 * Selected rows are resolved against the rows currently on screen, so a filter change can
 * never leave a count that names rows the user cannot see.
 */
export function selectionTargets(
  rows: readonly LedgerRow[],
  selected: ReadonlySet<string>
): SelectionTargets {
  const chosen = rows.filter((row) => selected.has(row.rowId))
  const transactionIds: TransactionId[] = []
  const groupIds: TransactionGroupId[] = []

  for (const row of chosen) {
    if (isGroupRow(row)) {
      groupIds.push(row.groupId)
    } else {
      transactionIds.push(row.transactionId)
    }
  }

  return {
    rows: chosen,
    count: chosen.length,
    transactionIds,
    groupIds,
    subjects: visibilitySubjects(chosen),
  }
}

export interface SelectionAction {
  readonly label: string
  readonly intent: VisibilityIntent
  readonly plan: VisibilityPlan
  readonly isBlocked: boolean
  readonly note: string | null
}

export interface SelectionActions {
  readonly review: SelectionAction
  readonly hide: SelectionAction
}

function partialNote(plan: VisibilityPlan): string | null {
  const refusal = plan.refusals[0]
  if (refusal === undefined) return null
  if (plan.writes.length === 0) return refusal.reason
  const refused = refusedCount(plan)
  const rows = refused === 1 ? "row" : "rows"
  return `${String(refused)} selected ${rows} will not change: ${refusal.reason}`
}

function action(label: string, plan: VisibilityPlan): SelectionAction {
  return {
    label,
    intent: plan.intent,
    plan,
    isBlocked: plan.writes.length === 0,
    note: partialNote(plan),
  }
}

export function selectionActions(targets: SelectionTargets): SelectionActions {
  const subjects = targets.subjects
  const hide = planVisibility(subjects, "hide")
  const unhide = planVisibility(subjects, "unhide")
  const preferUnhide = hide.writes.length === 0 && unhide.writes.length > 0

  return {
    review: action("Mark reviewed", planVisibility(subjects, "markReviewed")),
    hide: preferUnhide ? action("Unhide", unhide) : action("Hide", hide),
  }
}

export interface LedgerSelection {
  readonly ids: ReadonlySet<string>
  readonly isSelected: (rowId: string) => boolean
  readonly toggle: (rowId: string) => void
  readonly setMany: (rowIds: readonly string[], selected: boolean) => void
  readonly clear: () => void
}

export function useLedgerSelection(): LedgerSelection {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = useCallback((rowId: string) => {
    setIds((previous) => {
      const next = new Set(previous)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }, [])

  const setMany = useCallback(
    (rowIds: readonly string[], selected: boolean) => {
      setIds((previous) => {
        const next = new Set(previous)
        for (const rowId of rowIds) {
          if (selected) {
            next.add(rowId)
          } else {
            next.delete(rowId)
          }
        }
        return next
      })
    },
    []
  )

  const clear = useCallback(() => {
    setIds(new Set())
  }, [])

  return useMemo(
    () => ({
      ids,
      isSelected: (rowId: string) => ids.has(rowId),
      toggle,
      setMany,
      clear,
    }),
    [ids, toggle, setMany, clear]
  )
}
