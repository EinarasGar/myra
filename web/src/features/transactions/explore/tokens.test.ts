import { describe, expect, it } from "vitest"

import { planLedgerQuery } from "../api"

import type { ExploreSearch, TokenLabels } from "./tokens"
import {
  buildLedgerTokens,
  CLEARED_SEARCH,
  clearToken,
  isIsoDate,
  parseTokenInput,
  searchType,
} from "./tokens"

const LABELS: TokenLabels = {
  accountName: (accountId) =>
    accountId === "a1" ? "Lloyds Current" : accountId,
  categoryName: (categoryId) =>
    categoryId === 7 ? "Groceries" : `Category ${String(categoryId)}`,
}

function tokens(search: ExploreSearch) {
  return buildLedgerTokens(search, LABELS)
}

describe("building tokens from the URL", () => {
  it("resolves an account id to its name", () => {
    expect(tokens({ account: "a1" })).toEqual([
      { key: "account", accountId: "a1", label: "Lloyds Current" },
    ])
  })

  it("falls back to the raw id when the account is not loaded", () => {
    expect(tokens({ account: "missing" })[0]).toMatchObject({
      label: "missing",
    })
  })

  it("drops a blank text filter rather than emitting an empty token", () => {
    expect(tokens({ q: "   " })).toEqual([])
  })

  it("drops a date that is not a date", () => {
    expect(tokens({ from: "last tuesday" })).toEqual([])
    expect(tokens({ from: "2026-13-45" })).toEqual([])
  })

  it("drops a type the domain does not know", () => {
    expect(searchType({ type: "teleportation" })).toBeNull()
    expect(tokens({ type: "teleportation" })).toEqual([])
  })

  it("puts text first so an account demotes it in place", () => {
    const built = tokens({ q: "tesco", account: "a1" })
    expect(built.map((token) => token.key)).toEqual(["text", "account"])

    const plan = planLedgerQuery(built)
    expect(plan.query).toBeUndefined()
    expect(plan.unsupportedTokens.map((token) => token.key)).toEqual(["text"])
    expect(plan.appliedTokens.map((token) => token.key)).toEqual(["account"])
  })

  it("emits every dimension the bar can express", () => {
    const built = tokens({
      q: "tesco",
      account: "a1",
      category: 7,
      type: "regular",
      from: "2026-07-01",
      to: "2026-07-31",
    })
    expect(built.map((token) => token.key)).toEqual([
      "text",
      "account",
      "category",
      "type",
      "dateFrom",
      "dateTo",
    ])
  })

  it("marks everything except the account as unapplied", () => {
    const plan = planLedgerQuery(
      tokens({
        q: "tesco",
        account: "a1",
        category: 7,
        type: "regular",
        from: "2026-07-01",
        to: "2026-07-31",
      })
    )
    expect(plan.hasUnsupportedTokens).toBe(true)
    expect(plan.unsupportedTokens.map((token) => token.key)).toEqual([
      "text",
      "category",
      "type",
      "dateFrom",
      "dateTo",
    ])
  })

  it("keeps text applied when no account narrows the source", () => {
    const plan = planLedgerQuery(tokens({ q: "tesco" }))
    expect(plan.query).toBe("tesco")
    expect(plan.hasUnsupportedTokens).toBe(false)
  })
})

describe("clearing a token", () => {
  it.each([
    ["text", { q: "x" }, "q"],
    ["account", { account: "a1" }, "account"],
    ["category", { category: 7 }, "category"],
    ["type", { type: "regular" }, "type"],
    ["dateFrom", { from: "2026-07-01" }, "from"],
    ["dateTo", { to: "2026-07-01" }, "to"],
  ] as const)("clears the %s search param", (_key, search, param) => {
    const token = tokens(search)[0]
    expect(token).toBeDefined()
    expect(clearToken(token!)).toEqual({ [param]: undefined })
  })

  it("clears every filter dimension at once and keeps grouping", () => {
    expect(Object.keys(CLEARED_SEARCH).sort()).toEqual([
      "account",
      "category",
      "from",
      "q",
      "to",
      "type",
    ])
    expect(tokens(CLEARED_SEARCH)).toEqual([])
  })
})

describe("typing into the bar", () => {
  it("ignores an empty submission", () => {
    expect(parseTokenInput("   ")).toBeNull()
  })

  it("treats bare words as a description search", () => {
    expect(parseTokenInput("weekly shop")).toEqual({
      ok: true,
      patch: { q: "weekly shop" },
    })
  })

  it("treats an unknown key as text so a colon still searches", () => {
    expect(parseTokenInput("ref:1234")).toEqual({
      ok: true,
      patch: { q: "ref:1234" },
    })
  })

  it("parses a date range", () => {
    expect(parseTokenInput("from:2026-07-01")).toEqual({
      ok: true,
      patch: { from: "2026-07-01" },
    })
    expect(parseTokenInput("to: 2026-07-31")).toEqual({
      ok: true,
      patch: { to: "2026-07-31" },
    })
  })

  it("refuses a date it cannot parse instead of filtering on nothing", () => {
    const result = parseTokenInput("from:yesterday")
    expect(result?.ok).toBe(false)
    expect(result?.ok === false ? result.message : "").toContain("not a date")
  })

  it("accepts a type by tag or by its display name", () => {
    expect(parseTokenInput("type:regular")).toEqual({
      ok: true,
      patch: { type: "regular" },
    })
    expect(parseTokenInput("type:Purchase")).toEqual({
      ok: true,
      patch: { type: "regular" },
    })
  })

  it("refuses an unknown type", () => {
    const result = parseTokenInput("type:teleport")
    expect(result?.ok).toBe(false)
  })
})

describe("iso dates", () => {
  it.each(["2026-07-01", "1999-12-31"])("accepts %s", (value) => {
    expect(isIsoDate(value)).toBe(true)
  })

  it.each(["2026-7-1", "01/07/2026", "", "2026-02-30x"])(
    "rejects %s",
    (value) => {
      expect(isIsoDate(value)).toBe(false)
    }
  )
})
