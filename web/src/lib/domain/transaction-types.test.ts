import { describe, expect, it } from "vitest"

import {
  checkTransactionRules,
  getTransactionInputSchema,
  getTransactionTypeConfig,
  impliedUnitPrice,
  isInternalTransfer,
  isTransactionTypeTag,
  TRANSACTION_TYPE_CONFIG,
  TRANSACTION_TYPE_GROUPS,
  TRANSACTION_TYPES,
  transactionFlowTone,
  transactionInputSchemas,
  validateTransactionInput,
  validateTransactionInputOfType,
  type TransactionTypeTag,
} from "./transaction-types"

const ACCOUNT_A = "11111111-1111-4111-8111-111111111111"
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222"
const DATE = 1_752_000_000

function entry(amount: number, accountId = ACCOUNT_A, assetId = 1) {
  return { account_id: accountId, asset_id: assetId, amount }
}

describe("transaction type inventory", () => {
  it("covers all thirteen server types exactly once", () => {
    expect(TRANSACTION_TYPES).toHaveLength(13)
    expect(new Set(TRANSACTION_TYPES).size).toBe(13)
    expect([...TRANSACTION_TYPES].sort()).toEqual(
      Object.keys(TRANSACTION_TYPE_CONFIG).sort()
    )
  })

  it("has a schema for every configured type", () => {
    expect(Object.keys(transactionInputSchemas).sort()).toEqual(
      Object.keys(TRANSACTION_TYPE_CONFIG).sort()
    )
  })

  it("includes cash_balance_transfer, the type the design brief omits", () => {
    expect(TRANSACTION_TYPES).toContain("cash_balance_transfer")
  })

  it("gives every type its own icon", () => {
    const icons = TRANSACTION_TYPES.map(
      (type) => TRANSACTION_TYPE_CONFIG[type].icon
    )
    expect(new Set(icons).size).toBe(TRANSACTION_TYPES.length)
  })

  it("keeps the icons inside one direction group visually apart", () => {
    const byDirection = new Map<string, string[]>()
    for (const type of TRANSACTION_TYPES) {
      const config = TRANSACTION_TYPE_CONFIG[type]
      const names = byDirection.get(config.direction) ?? []
      names.push(config.icon.displayName ?? "")
      byDirection.set(config.direction, names)
    }
    for (const names of byDirection.values()) {
      const families = names.map((name) => name.replace(/(Plus|Minus)$/, ""))
      expect(new Set(families).size).toBe(families.length)
    }
  })

  it("resolves the tone of a both-direction type from the row, not the type", () => {
    expect(transactionFlowTone("regular", -12)).toBe("out")
    expect(transactionFlowTone("regular", 12)).toBe("in")
    expect(transactionFlowTone("regular", 0)).toBe("neutral")
    expect(transactionFlowTone("regular", null)).toBe("neutral")
  })

  it("takes the tone from the type wherever the type fixes the direction", () => {
    expect(transactionFlowTone("cash_transfer_in", -1)).toBe("in")
    expect(transactionFlowTone("cash_transfer_out", 1)).toBe("out")
    expect(transactionFlowTone("asset_trade", 1)).toBe("neutral")
  })

  it("keys every config entry to its own discriminator", () => {
    for (const type of TRANSACTION_TYPES) {
      expect(TRANSACTION_TYPE_CONFIG[type].type).toBe(type)
    }
  })

  it("places every type in exactly one chooser group", () => {
    const grouped = TRANSACTION_TYPE_GROUPS.flatMap((group) =>
      group.types.map((config) => config.type)
    )
    expect(grouped.sort()).toEqual([...TRANSACTION_TYPES].sort())
  })

  it("declares a primary entry that exists in its own entry list", () => {
    for (const type of TRANSACTION_TYPES) {
      const config = TRANSACTION_TYPE_CONFIG[type]
      const fields = config.entries.map((slot) => slot.field as string)
      expect(fields).toContain(config.primaryEntry as string)
    }
  })

  it("declares two entries whenever the direction is internal", () => {
    for (const type of TRANSACTION_TYPES) {
      const config = TRANSACTION_TYPE_CONFIG[type]
      if (config.direction !== "internal") continue
      expect(config.entries).toHaveLength(2)
    }
  })

  it("only lets the regular type carry a category or description", () => {
    for (const type of TRANSACTION_TYPES) {
      const { category, description } = TRANSACTION_TYPE_CONFIG[type].fields
      expect(category).toBe(type === "regular")
      expect(description).toBe(type === "regular")
    }
  })

  it("only lets cash_dividend carry an origin asset", () => {
    for (const type of TRANSACTION_TYPES) {
      expect(TRANSACTION_TYPE_CONFIG[type].fields.originAsset).toBe(
        type === "cash_dividend"
      )
    }
  })

  it("treats reallocations and asset movements as cash-flow neutral", () => {
    const neutral = TRANSACTION_TYPES.filter(isInternalTransfer).sort()
    expect(neutral).toEqual(
      [
        "asset_balance_transfer",
        "asset_dividend",
        "asset_purchase",
        "asset_sale",
        "asset_trade",
        "asset_transfer_in",
        "asset_transfer_out",
        "cash_balance_transfer",
      ].sort()
    )
  })

  it("never colours an internal movement as income or spending", () => {
    for (const type of TRANSACTION_TYPES) {
      const config = TRANSACTION_TYPE_CONFIG[type]
      if (config.direction !== "internal") continue
      expect(config.figureIntent).toBe("neutral")
    }
  })

  it("recognises only real tags", () => {
    expect(isTransactionTypeTag("regular")).toBe(true)
    expect(isTransactionTypeTag("regular_transaction")).toBe(false)
    expect(isTransactionTypeTag("toString")).toBe(false)
    expect(isTransactionTypeTag(undefined)).toBe(false)
  })

  it("resolves a config by tag", () => {
    expect(getTransactionTypeConfig("asset_purchase").name).toBe("Buy asset")
    expect(getTransactionInputSchema("asset_purchase")).toBe(
      transactionInputSchemas.asset_purchase
    )
  })
})

describe("sign rules", () => {
  const cases: Array<[TransactionTypeTag, string, number, string]> = [
    ["cash_transfer_in", "entry", -50, "Must be a positive value."],
    ["cash_transfer_out", "entry", 50, "Must be a negative value."],
    ["cash_dividend", "entry", -1, "Must be a positive value."],
    ["asset_dividend", "entry", -1, "Must be a positive value."],
    ["asset_transfer_in", "entry", -1, "Must be a positive value."],
    ["asset_transfer_out", "entry", 1, "Must be a negative value."],
    ["account_fees", "entry", 1, "Must be a negative value."],
    ["regular", "entry", 0, "Must not be zero."],
  ]

  it.each(cases)("rejects %s with a bad %s", (type, field, amount, message) => {
    const issues = checkTransactionRules(type, { [field]: entry(amount) })
    expect(issues).toContainEqual({ field: `${field}.amount`, message })
  })

  it("accepts a correctly signed entry", () => {
    expect(
      checkTransactionRules("cash_transfer_in", { entry: entry(50) })
    ).toEqual([])
  })

  it("skips an entry that has not been filled in yet", () => {
    expect(checkTransactionRules("cash_transfer_in", {})).toEqual([])
    expect(
      checkTransactionRules("cash_transfer_in", {
        entry: { account_id: ACCOUNT_A },
      })
    ).toEqual([])
  })
})

describe("cross-field rules", () => {
  it("requires one account for an asset purchase", () => {
    const issues = checkTransactionRules("asset_purchase", {
      purchase_change: entry(10, ACCOUNT_A),
      cash_outgoings_change: entry(-500, ACCOUNT_B),
    })
    expect(issues).toEqual([
      {
        field: "purchase_change.account_id",
        message:
          "purchase_change.account_id and cash_outgoings_change.account_id must reference the same account.",
      },
      {
        field: "cash_outgoings_change.account_id",
        message:
          "purchase_change.account_id and cash_outgoings_change.account_id must reference the same account.",
      },
    ])
  })

  it("accepts a well-formed asset purchase", () => {
    expect(
      checkTransactionRules("asset_purchase", {
        purchase_change: entry(10, ACCOUNT_A, 7),
        cash_outgoings_change: entry(-500, ACCOUNT_A, 1),
      })
    ).toEqual([])
  })

  it("requires one account for an asset sale", () => {
    const issues = checkTransactionRules("asset_sale", {
      sale_entry: entry(-10, ACCOUNT_A),
      proceeds_entry: entry(500, ACCOUNT_B),
    })
    expect(issues.map((issue) => issue.field)).toEqual([
      "sale_entry.account_id",
      "proceeds_entry.account_id",
    ])
  })

  it("enforces every cash balance transfer rule", () => {
    const issues = checkTransactionRules("cash_balance_transfer", {
      outgoing_change: entry(-100, ACCOUNT_A, 1),
      incoming_change: entry(90, ACCOUNT_A, 2),
    })
    const fields = issues.map((issue) => issue.field)
    expect(fields).toContain("outgoing_change.asset_id")
    expect(fields).toContain("incoming_change.asset_id")
    expect(fields).toContain("outgoing_change.amount")
    expect(fields).toContain("incoming_change.amount")
    expect(fields).toContain("outgoing_change.account_id")
    expect(fields).toContain("incoming_change.account_id")
  })

  it("accepts a well-formed cash balance transfer", () => {
    expect(
      checkTransactionRules("cash_balance_transfer", {
        outgoing_change: entry(-100.1, ACCOUNT_A, 1),
        incoming_change: entry(100.1, ACCOUNT_B, 1),
      })
    ).toEqual([])
  })

  it("leaves asset balance transfers unconstrained beyond their signs, as the server does", () => {
    expect(
      checkTransactionRules("asset_balance_transfer", {
        outgoing_change: entry(-5, ACCOUNT_A, 3),
        incoming_change: entry(4, ACCOUNT_A, 9),
      })
    ).toEqual([])
  })

  it("skips a pair rule while one side is still empty", () => {
    expect(
      checkTransactionRules("asset_purchase", {
        purchase_change: entry(10, ACCOUNT_A),
      })
    ).toEqual([])
  })
})

describe("input schemas", () => {
  it("parses a valid regular transaction and trims the description", () => {
    const result = validateTransactionInput({
      type: "regular",
      date: DATE,
      entry: entry(-42.18),
      category_id: 3,
      description: "  Waitrose  ",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({
      type: "regular",
      date: DATE,
      entry: entry(-42.18),
      category_id: 3,
      description: "Waitrose",
    })
  })

  it("drops a blank description rather than failing an optional field", () => {
    const result = validateTransactionInputOfType("regular", {
      type: "regular",
      date: DATE,
      entry: entry(10),
      category_id: 3,
      description: "   ",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).not.toHaveProperty("description", "   ")
  })

  it("rejects a description longer than the server allows", () => {
    const result = validateTransactionInputOfType("regular", {
      type: "regular",
      date: DATE,
      entry: entry(10),
      category_id: 3,
      description: "x".repeat(501),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors.description).toEqual([
      "Must be between 1 and 500 characters.",
    ])
  })

  it("reports domain issues under server-shaped field paths", () => {
    const result = validateTransactionInput({
      type: "cash_balance_transfer",
      date: DATE,
      outgoing_change: entry(-100, ACCOUNT_A, 1),
      incoming_change: entry(-100, ACCOUNT_B, 1),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors["incoming_change.amount"]).toContain(
      "Must be a positive value."
    )
  })

  it("reports a missing account under the entry path", () => {
    const result = validateTransactionInput({
      type: "cash_transfer_in",
      date: DATE,
      entry: { asset_id: 1, amount: 10 },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.fieldErrors)).toContain("entry.account_id")
  })

  it("indexes fee errors like the error layer does", () => {
    const result = validateTransactionInput({
      type: "cash_transfer_in",
      date: DATE,
      entry: entry(10),
      fees: [
        { account_id: ACCOUNT_A, asset_id: 1, amount: -1, fee_type: "nope" },
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.fieldErrors)).toContain("fees[0].fee_type")
  })

  it("accepts an omitted fees list", () => {
    expect(
      validateTransactionInput({
        type: "account_fees",
        date: DATE,
        entry: entry(-2.5),
      }).ok
    ).toBe(true)
  })

  it("refuses an unknown discriminator", () => {
    const result = validateTransactionInput({ type: "regular_transaction" })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.fieldErrors)).toContain("type")
  })

  it("validates every type through its own schema", () => {
    for (const type of TRANSACTION_TYPES) {
      const config = TRANSACTION_TYPE_CONFIG[type]
      const draft: Record<string, unknown> = { type, date: DATE }
      config.entries.forEach((slot, index) => {
        const accountId =
          config.fields.accounts === 2 && index > 0 ? ACCOUNT_B : ACCOUNT_A
        draft[slot.field as string] = entry(
          slot.sign === "negative" ? -100 : 100,
          accountId
        )
      })
      if (config.fields.category) draft.category_id = 1
      if (config.fields.originAsset) draft.origin_asset_id = 4
      expect(validateTransactionInputOfType(type, draft).ok).toBe(true)
    }
  })
})

describe("impliedUnitPrice", () => {
  it("divides cash by units regardless of sign", () => {
    expect(impliedUnitPrice(8, -672.8)).toBeCloseTo(84.1)
    expect(impliedUnitPrice(-8, 672.8)).toBeCloseTo(84.1)
  })

  it("returns null when it cannot be computed", () => {
    expect(impliedUnitPrice(0, 100)).toBeNull()
    expect(impliedUnitPrice(null, 100)).toBeNull()
    expect(impliedUnitPrice(8, undefined)).toBeNull()
    expect(impliedUnitPrice(Number.NaN, 100)).toBeNull()
  })
})
