import { describe, expect, it } from "vitest"

import { TRANSACTION_TYPES } from "@/lib/domain/transaction-types"

import type { LedgerFilterToken } from "./filters"
import { LEDGER_FILTER_SUPPORT, planLedgerQuery, tokenLabel } from "./filters"
import { ACCOUNT_CURRENT, ACCOUNT_ISA, CATEGORY_GROCERIES } from "./fixtures"

const textToken: LedgerFilterToken = { key: "text", value: "tesco" }
const accountToken: LedgerFilterToken = {
  key: "account",
  accountId: ACCOUNT_CURRENT,
  label: "Lloyds Current",
}
const categoryToken: LedgerFilterToken = {
  key: "category",
  categoryId: CATEGORY_GROCERIES,
  label: "Groceries",
}

describe("planLedgerQuery", () => {
  it("reports an unfiltered ledger", () => {
    const plan = planLedgerQuery()
    expect(plan).toMatchObject({
      source: "combined",
      accountId: null,
      query: undefined,
      isFiltered: false,
      hasUnsupportedTokens: false,
    })
  })

  it("executes free text against the query param", () => {
    const plan = planLedgerQuery([textToken])
    expect(plan.query).toBe("tesco")
    expect(plan.appliedTokens).toEqual([textToken])
    expect(plan.unsupportedTokens).toEqual([])
  })

  it("ignores a blank text token entirely", () => {
    const plan = planLedgerQuery([{ key: "text", value: "   " }])
    expect(plan.query).toBeUndefined()
    expect(plan.isFiltered).toBe(false)
  })

  it("switches to the per-account listing for an account token", () => {
    const plan = planLedgerQuery([accountToken])
    expect(plan.source).toBe("account")
    expect(plan.accountId).toBe(ACCOUNT_CURRENT)
  })

  it("marks a second account token unsupported instead of silently ignoring it", () => {
    const second: LedgerFilterToken = {
      key: "account",
      accountId: ACCOUNT_ISA,
      label: "Trading 212 ISA",
    }
    const plan = planLedgerQuery([accountToken, second])
    expect(plan.accountId).toBe(ACCOUNT_CURRENT)
    expect(plan.unsupportedTokens).toEqual([second])
    expect(plan.hasUnsupportedTokens).toBe(true)
  })

  it("marks a second text token unsupported rather than concatenating it", () => {
    const second: LedgerFilterToken = { key: "text", value: "coffee" }
    const plan = planLedgerQuery([textToken, second])
    expect(plan.query).toBe("tesco")
    expect(plan.unsupportedTokens).toEqual([second])
  })

  it.each<LedgerFilterToken>([
    categoryToken,
    { key: "type", transactionType: "asset_purchase", label: "Buy asset" },
    { key: "dateFrom", value: "2026-07-01" },
    { key: "dateTo", value: "2026-07-26" },
    { key: "amountMin", value: 10 },
    { key: "amountMax", value: 100 },
    { key: "visibility", value: "ghost" },
  ])("cannot execute a $key token", (token) => {
    const plan = planLedgerQuery([token])
    expect(plan.unsupportedTokens).toEqual([token])
    expect(plan.appliedTokens).toEqual([])
    expect(plan.isFiltered).toBe(true)
    expect(LEDGER_FILTER_SUPPORT[token.key].support).toBe("unsupported")
  })

  it("demotes text to unsupported once an account scopes the query", () => {
    const plan = planLedgerQuery([textToken, accountToken])
    expect(plan.query).toBeUndefined()
    expect(plan.appliedTokens).toEqual([accountToken])
    expect(plan.unsupportedTokens).toEqual([textToken])
    expect(plan.hasUnsupportedTokens).toBe(true)
  })

  it("demotes text that trails the account token just the same", () => {
    const plan = planLedgerQuery([accountToken, textToken])
    expect(plan.query).toBeUndefined()
    expect(plan.unsupportedTokens).toEqual([textToken])
  })

  it("still drops a blank text token rather than reporting it unsupported", () => {
    const plan = planLedgerQuery([{ key: "text", value: "  " }, accountToken])
    expect(plan.unsupportedTokens).toEqual([])
    expect(plan.appliedTokens).toEqual([accountToken])
  })

  it("keeps the applied and unsupported tokens apart in a mixed query", () => {
    const plan = planLedgerQuery([textToken, accountToken, categoryToken])
    expect(plan.appliedTokens).toEqual([accountToken])
    expect(plan.unsupportedTokens).toEqual([textToken, categoryToken])
    expect(plan.source).toBe("account")
    expect(plan.query).toBeUndefined()
  })
})

describe("LEDGER_FILTER_SUPPORT", () => {
  it("documents a gap for every dimension the server cannot execute", () => {
    for (const [key, capability] of Object.entries(LEDGER_FILTER_SUPPORT)) {
      if (capability.support === "unsupported") {
        expect(capability.gap, key).not.toBeNull()
        expect(capability.note.length, key).toBeGreaterThan(0)
      }
    }
  })

  it("flags that free text only reaches stored descriptions", () => {
    expect(LEDGER_FILTER_SUPPORT.text.gap).toBe("B5")
  })

  it("marks text conditional because an account scope drops it", () => {
    expect(LEDGER_FILTER_SUPPORT.text.support).toBe("conditional")
    expect(planLedgerQuery([textToken]).appliedTokens).toEqual([textToken])
    expect(
      planLedgerQuery([textToken, accountToken]).unsupportedTokens
    ).toEqual([textToken])
  })

  it("claims unconditional server support only for tokens the planner always applies", () => {
    const serverKeys = Object.entries(LEDGER_FILTER_SUPPORT)
      .filter(([, capability]) => capability.support === "server")
      .map(([key]) => key)
    expect(serverKeys).toEqual(["account"])
    expect(planLedgerQuery([accountToken, textToken]).appliedTokens).toEqual([
      accountToken,
    ])
  })
})

describe("tokenLabel", () => {
  it("uses the design's key words", () => {
    expect(tokenLabel(categoryToken)).toEqual({ key: "is", value: "Groceries" })
    expect(tokenLabel(accountToken)).toEqual({
      key: "account",
      value: "Lloyds Current",
    })
  })

  it("labels every transaction type token", () => {
    for (const type of TRANSACTION_TYPES) {
      const label = tokenLabel({
        key: "type",
        transactionType: type,
        label: type,
      })
      expect(label.key).toBe("type")
    }
  })
})
