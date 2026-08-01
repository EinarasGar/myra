import type { TransactionVisibility } from "@/api"
import type { TransactionId } from "@/lib/query"

export const VISIBILITY_INTENTS = [
  "hide",
  "unhide",
  "markReviewed",
  "markUnreviewed",
] as const

export type VisibilityIntent = (typeof VISIBILITY_INTENTS)[number]

export type VisibilityTransition =
  | { readonly kind: "write"; readonly to: TransactionVisibility }
  | { readonly kind: "unchanged" }
  | { readonly kind: "refused"; readonly reason: string }

export const HIDING_AN_UNREVIEWED_ROW =
  "An unreviewed transaction cannot be hidden. A transaction is either awaiting review or hidden, never both, so hiding it would take it out of the review queue with nothing to put it back. Mark it reviewed first, then hide it."

const REVIEWING_A_HIDDEN_ROW =
  "A hidden transaction is not in the review queue, so there is nothing to mark reviewed. Unhide it first."

const UNREVIEWING_A_HIDDEN_ROW =
  "A hidden transaction cannot be sent back to the review queue — it is either awaiting review or hidden, never both. Unhide it first."

const UNCHANGED: VisibilityTransition = { kind: "unchanged" }

/**
 * `hidden` is reachable only from `default` — that refusal is what lets `unhide` restore the
 * exact state a row came from without anything having to remember it.
 */
export function visibilityTransition(
  current: TransactionVisibility,
  intent: VisibilityIntent
): VisibilityTransition {
  switch (intent) {
    case "hide":
      if (current === "ghost") {
        return { kind: "refused", reason: HIDING_AN_UNREVIEWED_ROW }
      }
      return current === "hidden" ? UNCHANGED : { kind: "write", to: "hidden" }
    case "unhide":
      return current === "hidden" ? { kind: "write", to: "default" } : UNCHANGED
    case "markReviewed":
      if (current === "hidden") {
        return { kind: "refused", reason: REVIEWING_A_HIDDEN_ROW }
      }
      return current === "ghost" ? { kind: "write", to: "default" } : UNCHANGED
    case "markUnreviewed":
      if (current === "hidden") {
        return { kind: "refused", reason: UNREVIEWING_A_HIDDEN_ROW }
      }
      return current === "default" ? { kind: "write", to: "ghost" } : UNCHANGED
  }
}

export function inverseIntent(intent: VisibilityIntent): VisibilityIntent {
  switch (intent) {
    case "hide":
      return "unhide"
    case "unhide":
      return "hide"
    case "markReviewed":
      return "markUnreviewed"
    case "markUnreviewed":
      return "markReviewed"
  }
}

export interface VisibilitySubject {
  readonly transactionId: TransactionId
  readonly visibility: TransactionVisibility
}

export interface VisibilityWrite {
  readonly visibility: TransactionVisibility
  readonly transactionIds: readonly TransactionId[]
}

export interface VisibilityRefusal {
  readonly reason: string
  readonly transactionIds: readonly TransactionId[]
}

export interface VisibilityPlan {
  readonly intent: VisibilityIntent
  readonly writes: readonly VisibilityWrite[]
  readonly unchanged: readonly TransactionId[]
  readonly refusals: readonly VisibilityRefusal[]
}

function append<K>(
  groups: Map<K, TransactionId[]>,
  key: K,
  transactionId: TransactionId
): void {
  const existing = groups.get(key)
  if (existing === undefined) {
    groups.set(key, [transactionId])
    return
  }
  existing.push(transactionId)
}

export function planVisibility(
  subjects: readonly VisibilitySubject[],
  intent: VisibilityIntent
): VisibilityPlan {
  const writes = new Map<TransactionVisibility, TransactionId[]>()
  const refusals = new Map<string, TransactionId[]>()
  const unchanged: TransactionId[] = []

  for (const subject of subjects) {
    const transition = visibilityTransition(subject.visibility, intent)
    if (transition.kind === "write") {
      append(writes, transition.to, subject.transactionId)
      continue
    }
    if (transition.kind === "refused") {
      append(refusals, transition.reason, subject.transactionId)
      continue
    }
    unchanged.push(subject.transactionId)
  }

  return {
    intent,
    writes: [...writes].map(([visibility, transactionIds]) => ({
      visibility,
      transactionIds,
    })),
    unchanged,
    refusals: [...refusals].map(([reason, transactionIds]) => ({
      reason,
      transactionIds,
    })),
  }
}

export function refusedCount(plan: VisibilityPlan): number {
  return plan.refusals.reduce(
    (total, refusal) => total + refusal.transactionIds.length,
    0
  )
}

export function writtenSubjects(plan: VisibilityPlan): VisibilitySubject[] {
  return plan.writes.flatMap((write) =>
    write.transactionIds.map((transactionId) => ({
      transactionId,
      visibility: write.visibility,
    }))
  )
}
