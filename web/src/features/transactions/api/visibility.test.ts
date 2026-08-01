import { describe, expect, it } from "vitest"

import type { TransactionVisibility } from "@/api"

import type { VisibilityIntent, VisibilitySubject } from "./visibility"
import {
  HIDING_AN_UNREVIEWED_ROW,
  inverseIntent,
  planVisibility,
  refusedCount,
  VISIBILITY_INTENTS,
  visibilityTransition,
  writtenSubjects,
} from "./visibility"

const VISIBILITIES: readonly TransactionVisibility[] = [
  "default",
  "ghost",
  "hidden",
]

function after(
  current: TransactionVisibility,
  intent: VisibilityIntent
): TransactionVisibility {
  const transition = visibilityTransition(current, intent)
  return transition.kind === "write" ? transition.to : current
}

function subject(
  transactionId: string,
  visibility: TransactionVisibility
): VisibilitySubject {
  return { transactionId, visibility }
}

describe("what a single transition is allowed to do", () => {
  it("refuses to hide an unreviewed transaction instead of overwriting the flag", () => {
    const transition = visibilityTransition("ghost", "hide")
    expect(transition).toEqual({
      kind: "refused",
      reason: HIDING_AN_UNREVIEWED_ROW,
    })
  })

  it("hides a reviewed transaction and leaves an already hidden one alone", () => {
    expect(visibilityTransition("default", "hide")).toEqual({
      kind: "write",
      to: "hidden",
    })
    expect(visibilityTransition("hidden", "hide")).toEqual({
      kind: "unchanged",
    })
  })

  it("only ever writes default as the undo of hidden, never as the undo of ghost", () => {
    expect(visibilityTransition("hidden", "unhide")).toEqual({
      kind: "write",
      to: "default",
    })
    expect(visibilityTransition("ghost", "unhide")).toEqual({
      kind: "unchanged",
    })
    expect(visibilityTransition("default", "unhide")).toEqual({
      kind: "unchanged",
    })
  })

  it("never turns a ghost into a reviewed transaction except on an explicit review", () => {
    const silent = VISIBILITY_INTENTS.filter(
      (intent) =>
        intent !== "markReviewed" && after("ghost", intent) !== "ghost"
    )
    expect(silent).toEqual([])
    expect(after("ghost", "markReviewed")).toBe("default")
  })

  it("refuses to move a hidden transaction in or out of the review queue", () => {
    expect(visibilityTransition("hidden", "markReviewed").kind).toBe("refused")
    expect(visibilityTransition("hidden", "markUnreviewed").kind).toBe(
      "refused"
    )
  })
})

describe("hide then unhide", () => {
  it("keeps a ghost a ghost through hide and unhide, because neither writes", () => {
    expect(visibilityTransition("ghost", "hide").kind).toBe("refused")
    expect(visibilityTransition("ghost", "unhide").kind).toBe("unchanged")
    expect(after("ghost", "hide")).toBe("ghost")
    expect(after("ghost", "unhide")).toBe("ghost")
  })

  it("round-trips every state a write can actually reach", () => {
    for (const visibility of VISIBILITIES) {
      for (const intent of VISIBILITY_INTENTS) {
        const transition = visibilityTransition(visibility, intent)
        if (transition.kind !== "write") continue
        expect(after(transition.to, inverseIntent(intent))).toBe(visibility)
      }
    }
  })
})

describe("planning a bulk change", () => {
  const mixed = [
    subject("tx-reviewed", "default"),
    subject("tx-unreviewed", "ghost"),
    subject("tx-hidden", "hidden"),
  ]

  it("preserves each row's prior state when hiding a mixed selection", () => {
    const plan = planVisibility(mixed, "hide")

    expect(plan.writes).toEqual([
      { visibility: "hidden", transactionIds: ["tx-reviewed"] },
    ])
    expect(plan.unchanged).toEqual(["tx-hidden"])
    expect(plan.refusals).toEqual([
      { reason: HIDING_AN_UNREVIEWED_ROW, transactionIds: ["tx-unreviewed"] },
    ])
    expect(refusedCount(plan)).toBe(1)
  })

  it("undoes only what it wrote, at the state it wrote", () => {
    const plan = planVisibility(mixed, "hide")
    const undone = planVisibility(
      writtenSubjects(plan),
      inverseIntent(plan.intent)
    )

    expect(writtenSubjects(undone)).toEqual([
      { transactionId: "tx-reviewed", visibility: "default" },
    ])
  })

  it("groups one write per target visibility", () => {
    const plan = planVisibility(
      [
        subject("tx-a", "ghost"),
        subject("tx-b", "ghost"),
        subject("tx-c", "hidden"),
      ],
      "markReviewed"
    )

    expect(plan.writes).toEqual([
      { visibility: "default", transactionIds: ["tx-a", "tx-b"] },
    ])
    expect(plan.refusals[0]?.transactionIds).toEqual(["tx-c"])
  })

  it("plans nothing at all for an empty selection", () => {
    const plan = planVisibility([], "hide")
    expect(plan.writes).toEqual([])
    expect(plan.refusals).toEqual([])
    expect(plan.unchanged).toEqual([])
  })
})
