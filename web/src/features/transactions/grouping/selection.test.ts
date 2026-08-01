import { describe, expect, it } from "vitest"

import type { GroupTransactionItem } from "@/api"

import type { LedgerRow } from "../api"
import { toGroupRow, toLookupIndex, toTransactionRow } from "../api"
import { groupItem, lookupTables, regular } from "../api/fixtures"

import {
  GROUP_NEEDS_MEMBERS,
  groupingActionFor,
  NEEDS_TWO,
  ONE_GROUP_AT_A_TIME,
} from "./selection"

const LOOKUP = toLookupIndex(lookupTables)

function transaction(transactionId: string): LedgerRow {
  return toTransactionRow(regular({ transaction_id: transactionId }), LOOKUP)
}

function group(groupId: string): LedgerRow {
  return toGroupRow(
    {
      ...(groupItem([
        regular({ transaction_id: `${groupId}-child` }),
      ]) as GroupTransactionItem),
      group_id: groupId,
    },
    LOOKUP
  )
}

describe("groupingActionFor", () => {
  it("offers nothing, and says nothing, on an empty selection", () => {
    expect(groupingActionFor([])).toEqual({ kind: "none", reason: null })
  })

  it("refuses a single transaction and explains why", () => {
    expect(groupingActionFor([transaction("tx-a")])).toEqual({
      kind: "none",
      reason: NEEDS_TWO,
    })
  })

  it("offers a new group for two or more loose transactions", () => {
    const action = groupingActionFor([transaction("tx-a"), transaction("tx-b")])
    expect(action.kind).toBe("create")
    if (action.kind !== "create") return
    expect(action.label).toBe("Group these 2")
    expect(action.members).toHaveLength(2)
  })

  it("offers an add when one group is selected alongside transactions", () => {
    const action = groupingActionFor([group("group-1"), transaction("tx-a")])
    expect(action.kind).toBe("add")
    if (action.kind !== "add") return
    expect(action.label).toBe("Add 1 to group")
    expect(action.group.groupId).toBe("group-1")
    expect(action.members).toHaveLength(1)
  })

  it("refuses two groups at once", () => {
    expect(groupingActionFor([group("group-1"), group("group-2")])).toEqual({
      kind: "none",
      reason: ONE_GROUP_AT_A_TIME,
    })
  })

  it("asks for members when only a group is selected", () => {
    expect(groupingActionFor([group("group-1")])).toEqual({
      kind: "none",
      reason: GROUP_NEEDS_MEMBERS,
    })
  })
})
