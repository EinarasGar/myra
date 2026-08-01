import { describe, expect, it } from "vitest"

import { HIDING_AN_UNREVIEWED_ROW, toLedgerRows, toLookupIndex } from "../api"
import {
  accountFees,
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} from "../api/fixtures"

import { selectionActions, selectionTargets } from "./selection"

const rows = toLedgerRows(
  [
    individualItem(regular()),
    individualItem(ghostTransfer()),
    individualItem(
      regular({ transaction_id: "tx-hidden", visibility: "hidden" })
    ),
    groupItem([regular({ transaction_id: "tx-a" }), accountFees()]),
  ],
  toLookupIndex(lookupTables)
)

function targets(...ids: string[]) {
  return selectionTargets(rows, new Set(ids))
}

describe("what a selection acts on", () => {
  it("counts nothing when nothing is chosen", () => {
    expect(targets().count).toBe(0)
  })

  it("names a transaction by its own id", () => {
    expect(targets("tx-regular").transactionIds).toEqual(["tx-regular"])
    expect(targets("tx-regular").groupIds).toEqual([])
  })

  it("deletes a group as a group, never as its children", () => {
    const chosen = targets("group-1")
    expect(chosen.groupIds).toEqual(["group-1"])
    expect(chosen.transactionIds).toEqual([])
  })

  it("carries each chosen row's own visibility, group children included", () => {
    const chosen = targets("tx-regular", "tx-ghost", "tx-hidden")
    expect(chosen.subjects).toEqual([
      { transactionId: "tx-regular", visibility: "default" },
      { transactionId: "tx-ghost", visibility: "ghost" },
      { transactionId: "tx-hidden", visibility: "hidden" },
    ])
    expect(targets("group-1").subjects.map((s) => s.transactionId)).toEqual([
      "tx-a",
      "tx-fee",
    ])
  })

  it("forgets ids that are no longer on screen rather than inflating the count", () => {
    const chosen = targets("tx-regular", "tx-from-a-previous-filter")
    expect(chosen.count).toBe(1)
    expect(chosen.transactionIds).toEqual(["tx-regular"])
  })
})

describe("what the bulk bar offers", () => {
  it("only offers Mark reviewed when something chosen is unreviewed", () => {
    expect(selectionActions(targets("tx-regular")).review.isBlocked).toBe(true)
    expect(selectionActions(targets("tx-ghost")).review.isBlocked).toBe(false)
  })

  it("hides a reviewed row and says so plainly", () => {
    const hide = selectionActions(targets("tx-regular")).hide
    expect(hide.label).toBe("Hide")
    expect(hide.intent).toBe("hide")
    expect(hide.isBlocked).toBe(false)
    expect(hide.note).toBeNull()
    expect(hide.plan.writes).toEqual([
      { visibility: "hidden", transactionIds: ["tx-regular"] },
    ])
  })

  it("offers Unhide once everything chosen is hidden, and restores default only", () => {
    const hide = selectionActions(targets("tx-hidden")).hide
    expect(hide.label).toBe("Unhide")
    expect(hide.plan.writes).toEqual([
      { visibility: "default", transactionIds: ["tx-hidden"] },
    ])
  })

  it("refuses to hide an unreviewed row and explains why instead of writing", () => {
    const hide = selectionActions(targets("tx-ghost")).hide
    expect(hide.label).toBe("Hide")
    expect(hide.isBlocked).toBe(true)
    expect(hide.plan.writes).toEqual([])
    expect(hide.note).toBe(HIDING_AN_UNREVIEWED_ROW)
  })

  it("hides what it can from a mixed selection and names what it left alone", () => {
    const hide = selectionActions(targets("tx-regular", "tx-ghost")).hide
    expect(hide.isBlocked).toBe(false)
    expect(hide.plan.writes).toEqual([
      { visibility: "hidden", transactionIds: ["tx-regular"] },
    ])
    expect(hide.note).toContain("1 selected row will not change")
    expect(hide.note).toContain(HIDING_AN_UNREVIEWED_ROW)
  })

  it("says why a hidden row cannot be marked reviewed instead of just greying out", () => {
    const actions = selectionActions(targets("tx-hidden"))
    expect(actions.review.isBlocked).toBe(true)
    expect(actions.review.note).toContain("not in the review queue")
  })

  it("blocks both actions when nothing is chosen", () => {
    const actions = selectionActions(targets())
    expect(actions.review.isBlocked).toBe(true)
    expect(actions.hide.isBlocked).toBe(true)
  })
})
