import { describe, expect, it } from "vitest"

import { comparablePins, togglePin } from "./pins"
import { toProposalView } from "./proposals"
import type { AnswerCard } from "./answers"
import type { ProposalPart } from "./types"

function proposal(name: string, args: unknown): ProposalPart {
  return { kind: "proposal", toolCallId: "c1", name, args, decision: "pending" }
}

describe("toProposalView", () => {
  const view = toProposalView(
    proposal("create_transaction", {
      date: "2026-06-04",
      description: "Tesco",
      amount: 42.18,
      account_id: "acc-1",
      category_id: 7,
      asset_id: 1,
    })
  )

  it("names what will be written in the product's words", () => {
    expect(view.title).toBe("Record a transaction")
    expect(view.typeLabel).toBe("Regular")
  })

  it("types each argument so ids can be resolved rather than printed raw", () => {
    const byKey = Object.fromEntries(
      view.fields.map((field) => [field.key, field.value])
    )
    expect(byKey.account_id).toEqual({ kind: "account", accountId: "acc-1" })
    expect(byKey.category_id).toEqual({ kind: "category", categoryId: 7 })
    expect(byKey.amount).toEqual({ kind: "amount", value: 42.18, assetId: 1 })
    expect(byKey.date).toEqual({ kind: "date", value: "2026-06-04" })
  })

  it("orders the fields the way the card reads them, description first", () => {
    expect(view.fields[0]?.key).toBe("description")
  })

  it("shows every argument, so nothing the tool would write is hidden", () => {
    const keys = [...view.fields, ...view.extras].map((field) => field.key)
    expect(keys.sort()).toEqual([
      "account_id",
      "amount",
      "asset_id",
      "category_id",
      "date",
      "description",
    ])
  })

  it("marks a delete as destructive", () => {
    expect(
      toProposalView(proposal("delete_transaction", { transaction_id: "t1" }))
        .destructive
    ).toBe(true)
    expect(view.destructive).toBe(false)
  })

  it("still renders a tool it has no title for, from its own name", () => {
    const unknown = toProposalView(
      proposal("record_something_new", { foo: "bar" })
    )
    expect(unknown.title).toBe("Record something new")
    expect(unknown.extras[0]).toEqual({
      key: "foo",
      label: "Foo",
      value: { kind: "text", text: "bar" },
    })
  })

  it("drops nulls rather than printing an empty row", () => {
    const partial = toProposalView(
      proposal("record_fee", {
        account_id: "a",
        asset_id: 1,
        amount: 3,
        date: null,
      })
    )
    expect(
      [...partial.fields, ...partial.extras].some(
        (field) => field.key === "date"
      )
    ).toBe(false)
  })
})

function card(id: string, headline: AnswerCard["headline"]): AnswerCard {
  return {
    id,
    tool: "aggregate_transactions",
    label: "Totals by category",
    headline,
    headlineNote: "",
    countLabel: null,
    rows: [],
    rowsLabel: null,
    refinements: [],
    ledger: null,
    provenance: { tool: "aggregate_transactions", facts: [], at: 1 },
    footnote: null,
  }
}

describe("comparablePins", () => {
  it("subtracts two money answers in the same currency", () => {
    expect(
      comparablePins([
        card("a", { value: 100, kind: "money", currency: "GBP", signed: true }),
        card("b", { value: 130, kind: "money", currency: "GBP", signed: true }),
      ])
    ).toEqual({ difference: 30, currency: "GBP" })
  })

  it("refuses to subtract across currencies", () => {
    expect(
      comparablePins([
        card("a", { value: 100, kind: "money", currency: "GBP", signed: true }),
        card("b", { value: 130, kind: "money", currency: "USD", signed: true }),
      ]).difference
    ).toBeNull()
  })

  it("refuses to subtract a count from a total", () => {
    expect(
      comparablePins([
        card("a", { value: 100, kind: "money", currency: "GBP", signed: true }),
        card("b", { value: 3, kind: "plain", signed: false }),
      ]).difference
    ).toBeNull()
  })

  it("refuses when either side has no figure at all", () => {
    expect(
      comparablePins([
        card("a", {
          value: null,
          kind: "money",
          currency: "GBP",
          signed: true,
        }),
        card("b", { value: 3, kind: "money", currency: "GBP", signed: true }),
      ]).difference
    ).toBeNull()
  })
})

describe("togglePin", () => {
  it("keeps at most two pins, dropping the oldest", () => {
    const a = card("a", null)
    const b = card("b", null)
    const c = card("c", null)
    expect(
      togglePin(togglePin(togglePin([], a), b), c).map((pin) => pin.id)
    ).toEqual(["b", "c"])
  })

  it("unpins a card that is already pinned", () => {
    const a = card("a", null)
    expect(togglePin(togglePin([], a), a)).toEqual([])
  })
})
