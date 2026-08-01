import { describe, expect, it } from "vitest"

import type { LedgerGroupRow, LedgerTransactionRow } from "../api"
import { toGroupRow, toLookupIndex, toTransactionRow } from "../api"
import {
  accountFees,
  DAY,
  groupItem,
  lookupTables,
  regular,
} from "../api/fixtures"
import type { GroupTransactionItem } from "@/api"

import {
  CATEGORY_REQUIRED,
  DATE_UNREADABLE,
  DESCRIPTION_REQUIRED,
  MEMBERS_TOO_FEW,
} from "./copy"
import {
  addedMemberIds,
  groupDraftErrors,
  projectedGroup,
  resolveGroupDraft,
  seedAddDraft,
  seedGroupDraft,
  withMember,
  withoutMember,
} from "./members"

const LOOKUP = toLookupIndex(lookupTables)
const NOW = new Date(DAY * 1000)

function row(
  transactionId: string,
  overrides: Parameters<typeof regular>[0] = {}
): LedgerTransactionRow {
  return toTransactionRow(
    regular({ transaction_id: transactionId, ...overrides }),
    LOOKUP
  )
}

function group(): LedgerGroupRow {
  return toGroupRow(
    groupItem([regular({ transaction_id: "tx-held" })]) as GroupTransactionItem,
    LOOKUP
  )
}

describe("seedGroupDraft", () => {
  it("takes the latest of the members' dates", () => {
    const draft = seedGroupDraft(
      [row("tx-a", { date: DAY - 86_400 }), row("tx-b", { date: DAY })],
      NOW
    )
    expect(draft.date).toBe(DAY)
  })

  it("carries a description over only when every member shares it", () => {
    expect(seedGroupDraft([row("tx-a"), row("tx-b")], NOW).description).toBe(
      "Tesco"
    )
    expect(
      seedGroupDraft([row("tx-a"), row("tx-b", { description: "Aldi" })], NOW)
        .description
    ).toBe("")
  })

  it("carries over the one category the members name", () => {
    expect(seedGroupDraft([row("tx-a"), row("tx-b")], NOW).categoryId).toBe(7)
    expect(
      seedGroupDraft(
        [row("tx-a"), toTransactionRow(accountFees(), LOOKUP)],
        NOW
      ).categoryId
    ).toBe(7)
  })

  it("carries no category when the members disagree", () => {
    expect(
      seedGroupDraft([row("tx-a"), row("tx-b", { category_id: 99 })], NOW)
        .categoryId
    ).toBeNull()
  })

  it("falls back to today when nothing is picked yet", () => {
    const draft = seedGroupDraft([], NOW)
    expect(draft.members).toHaveLength(0)
    expect(draft.date).not.toBeNull()
    expect(new Date((draft.date ?? 0) * 1000).toDateString()).toBe(
      NOW.toDateString()
    )
  })
})

describe("groupDraftErrors", () => {
  const valid = seedGroupDraft([row("tx-a"), row("tx-b")], NOW)

  it("accepts a seeded draft of two members", () => {
    expect(groupDraftErrors(valid, "create")).toEqual({})
  })

  it("refuses an empty description", () => {
    expect(
      groupDraftErrors({ ...valid, description: "   " }, "create").description
    ).toBe(DESCRIPTION_REQUIRED)
  })

  it("refuses a date it could not read", () => {
    expect(
      groupDraftErrors(
        { ...valid, dateText: "when pigs fly", date: null },
        "create"
      ).date
    ).toBe(DATE_UNREADABLE)
  })

  it("refuses a group with no category", () => {
    expect(
      groupDraftErrors({ ...valid, categoryId: null }, "create").category
    ).toBe(CATEGORY_REQUIRED)
  })

  it("needs two members to create but only one to add", () => {
    const single = { ...valid, members: [row("tx-a")] }
    expect(groupDraftErrors(single, "create").members).toBe(MEMBERS_TOO_FEW)
    expect(groupDraftErrors(single, "add").members).toBeUndefined()
  })
})

describe("member editing", () => {
  it("adds a member once", () => {
    const draft = seedGroupDraft([row("tx-a")], NOW)
    const twice = withMember(withMember(draft, row("tx-b")), row("tx-b"))
    expect(twice.members.map((member) => member.transactionId)).toEqual([
      "tx-a",
      "tx-b",
    ])
  })

  it("removes a member by id", () => {
    const draft = seedGroupDraft([row("tx-a"), row("tx-b")], NOW)
    expect(
      withoutMember(draft, "tx-a").members.map((member) => member.transactionId)
    ).toEqual(["tx-b"])
  })
})

describe("projectedGroup", () => {
  it("sends the whole membership, existing rows first", () => {
    const target = group()
    const draft = seedAddDraft(target, [row("tx-new")])
    const resolved = resolveGroupDraft(draft, "add")
    expect(resolved).not.toBeNull()
    if (resolved === null) return

    const projected = projectedGroup(target, resolved)
    expect(projected.transactions.map((child) => child.transaction_id)).toEqual(
      ["tx-held", "tx-new"]
    )
    expect(addedMemberIds(target, resolved)).toEqual(["tx-new"])
  })

  it("never sends a member twice, so a re-pick cannot delete the original", () => {
    const target = group()
    const draft = seedAddDraft(target, [row("tx-held"), row("tx-new")])
    const resolved = resolveGroupDraft(draft, "add")
    if (resolved === null) throw new Error("draft should resolve")

    expect(
      projectedGroup(target, resolved).transactions.map(
        (child) => child.transaction_id
      )
    ).toEqual(["tx-held", "tx-new"])
  })

  it("carries the edited description, date and category onto the group", () => {
    const target = group()
    const resolved = resolveGroupDraft(
      { ...seedAddDraft(target, [row("tx-new")]), description: "Renamed" },
      "add"
    )
    if (resolved === null) throw new Error("draft should resolve")
    expect(projectedGroup(target, resolved).description).toBe("Renamed")
  })
})
