import { describe, expect, it } from "vitest"

import { answerCardTsv, toAnswerCard } from "./answers"
import type { ToolPart } from "./types"

function step(
  name: string,
  input: unknown,
  output: string,
  phase: ToolPart["phase"] = "done"
): ToolPart {
  return {
    kind: "tool",
    callId: "c1",
    name,
    input,
    output,
    phase,
    at: 1_700_000,
  }
}

const AGGREGATE = JSON.stringify({
  currency: "GBP",
  groups: [
    { group_name: "Groceries", total_amount: -412.5, transaction_count: 18 },
    { group_name: "Transport", total_amount: -87.25, transaction_count: 6 },
  ],
})

describe("toAnswerCard", () => {
  it("returns nothing while the tool is still running", () => {
    expect(
      toAnswerCard(step("aggregate_transactions", {}, "", "running"))
    ).toBeNull()
  })

  it("returns nothing for a tool it has no card for, rather than guessing", () => {
    expect(toAnswerCard(step("run_script", {}, '{"anything":1}'))).toBeNull()
  })

  it("returns nothing when the output is not the shape it expects", () => {
    expect(
      toAnswerCard(step("aggregate_transactions", {}, "not json"))
    ).toBeNull()
    expect(
      toAnswerCard(step("aggregate_transactions", {}, '{"currency":"GBP"}'))
    ).toBeNull()
  })
})

describe("aggregate_transactions card", () => {
  const card = toAnswerCard(
    step(
      "aggregate_transactions",
      { group_by: "category", date_from: "2026-06-01", date_to: "2026-06-30" },
      AGGREGATE
    )
  )

  it("totals the rows it prints, in the currency the tool named", () => {
    expect(card?.headline).toEqual({
      value: -499.75,
      kind: "money",
      currency: "GBP",
      signed: true,
    })
    expect(card?.headlineNote).toContain("across 2 groups")
    expect(card?.headlineNote).toContain("in GBP")
  })

  it("carries every row's own count and amount from the tool output", () => {
    expect(
      card?.rows.map((row) => [row.label, row.count, row.figure.value])
    ).toEqual([
      ["Groceries", 18, -412.5],
      ["Transport", 6, -87.25],
    ])
  })

  it("states the tool, the count, the scope and when it was read", () => {
    expect(card?.provenance.tool).toBe("aggregate_transactions")
    expect(card?.provenance.facts.join(" · ")).toContain("2 groups in GBP")
    expect(card?.provenance.facts.join(" · ")).toContain("2026-06-01")
    expect(card?.provenance.at).toBe(1_700_000)
  })

  it("offers a chip for every other grouping, and none for the one it already used", () => {
    const labels = card?.refinements.map((chip) => chip.label)
    expect(labels).toContain("by merchant")
    expect(labels).toContain("by account")
    expect(labels).toContain("by month")
    expect(labels).not.toContain("by category")
  })

  it("refuses a total when the tool says the list was truncated", () => {
    const truncated = toAnswerCard(
      step(
        "aggregate_transactions",
        { group_by: "category" },
        JSON.stringify({
          currency: "GBP",
          groups: [{ group_name: "A", total_amount: -1, transaction_count: 1 }],
          note: "Showing the 100 largest groups; more match.",
        })
      )
    )
    expect(truncated?.headline?.value).toBeNull()
    expect(truncated?.footnote).toContain("more match")
  })

  it("does not offer a ledger link when nothing it filtered on is filterable there", () => {
    expect(card?.ledger).toBeNull()
  })

  it("links into the ledger on a description filter and names the date range as unapplied", () => {
    const filtered = toAnswerCard(
      step(
        "aggregate_transactions",
        {
          group_by: "category",
          description_filter: "tesco",
          date_from: "2026-06-01",
        },
        AGGREGATE
      )
    )
    expect(filtered?.ledger?.search).toEqual({ q: "tesco", from: "2026-06-01" })
    expect(filtered?.ledger?.unapplied).toEqual(["date range"])
  })

  it("demotes text to unapplied when an account token is also present", () => {
    const both = toAnswerCard(
      step(
        "aggregate_transactions",
        {
          group_by: "category",
          description_filter: "tesco",
          account_id: "acc-1",
        },
        AGGREGATE
      )
    )
    expect(both?.ledger?.search).toEqual({ q: "tesco", account: "acc-1" })
    expect(both?.ledger?.unapplied).toEqual(["text"])
  })
})

describe("query_transactions card", () => {
  const card = toAnswerCard(
    step(
      "query_transactions",
      { query: "tesco" },
      JSON.stringify({
        transactions: [
          {
            transaction_id: "t1",
            date: "2026-06-04",
            transaction_type: "regular",
            description: "Tesco",
            amount: -42.18,
            unit: "GBP",
            account: "Lloyds Current",
          },
        ],
        has_more: true,
      })
    )
  )

  it("counts rather than totalling, because the rows are in per-asset units", () => {
    expect(card?.headline).toEqual({ value: 1, kind: "plain", signed: false })
    expect(card?.rows[0]?.figure).toEqual({
      value: -42.18,
      kind: "units",
      ticker: "GBP",
      signed: true,
    })
    expect(card?.footnote).toContain("asset's own units")
  })

  it("says out loud that more rows match than were read", () => {
    expect(card?.headlineNote).toContain("more match than were read")
    expect(card?.provenance.facts.join(" · ")).toContain("not all that match")
  })
})

describe("get_holdings card", () => {
  const card = toAnswerCard(
    step(
      "get_holdings",
      {},
      JSON.stringify({
        reference_currency: { asset_id: 1, code: "GBP" },
        total_value: 12500.5,
        holdings: [
          {
            asset_id: 4,
            asset_name: "Vanguard S&P 500",
            ticker: "VUSA",
            account_name: "Trading 212 ISA",
            units: 12,
            value: 12500.5,
          },
          {
            asset_id: 9,
            asset_name: "Studio flat",
            ticker: null,
            account_name: "Property",
            units: 1,
            value: null,
          },
        ],
        groups: null,
        unvalued_assets: ["Studio flat"],
      })
    )
  )

  it("names the holdings that are missing from the total instead of counting them as zero", () => {
    expect(card?.headline?.value).toBe(12500.5)
    expect(card?.headlineNote).toContain("no price path")
    expect(card?.headlineNote).toContain("Studio flat")
    expect(card?.rows[1]?.figure.value).toBeNull()
  })
})

describe("get_net_worth_history card", () => {
  const card = toAnswerCard(
    step(
      "get_net_worth_history",
      { range: "1y" },
      JSON.stringify({
        reference_currency: { asset_id: 1, code: "GBP" },
        range: "1y",
        start_value: 100,
        end_value: 250,
        change: 150,
        change_pct: 1.5,
        points: [{ date: "2026-01-01", value: 100 }],
      })
    )
  )

  it("leads on the real change and offers the other windows as refinements", () => {
    expect(card?.headline).toEqual({
      value: 150,
      kind: "money",
      currency: "GBP",
      signed: true,
    })
    expect(card?.refinements.map((chip) => chip.label)).toEqual([
      "the last month",
      "all time",
    ])
  })
})

describe("an answer with no rows", () => {
  it("prints an em dash, not £0.00, when nothing matched", () => {
    const card = toAnswerCard(
      step(
        "aggregate_transactions",
        { group_by: "category", date_from: "2026-06-01" },
        JSON.stringify({ currency: "GBP", groups: [] })
      )
    )
    expect(card?.headline?.value).toBeNull()
    expect(card?.headlineNote).toContain("Nothing matched")
    expect(card?.headlineNote).not.toContain("0 groups")
  })
})

describe("answerCardTsv", () => {
  it("lays an answer out as rows a spreadsheet can take", () => {
    const card = toAnswerCard(
      step("aggregate_transactions", { group_by: "category" }, AGGREGATE)
    )
    if (card === null) throw new Error("expected a card")

    expect(answerCardTsv(card, "GBP")).toBe(
      [
        "Totals by category\t−£499.75",
        "Groceries\t\t18\t−£412.50",
        "Transport\t\t6\t−£87.25",
      ].join("\n")
    )
  })
})
