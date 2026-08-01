import { describe, expect, it } from "vitest"

import type { TransactionInput } from "@/api"
import {
  TRANSACTION_TYPE_CONFIG,
  TRANSACTION_TYPES,
  transactionInputSchemas,
  validateTransactionInputOfType,
  type TransactionTypeTag,
} from "@/lib/domain/transaction-types"

import {
  buildCandidate,
  buildUpdatePayload,
  candidateFieldNames,
} from "./candidate"
import type { EditorDraft } from "./draft"
import { emptyDraft, setSlot } from "./draft"

const DATE = 1_753_920_000
const ACCOUNT_A = "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f"
const ACCOUNT_B = "1e2b7a5b-4c3d-4d6e-9f0a-1b2c3d4e5f60"
const GBP = 1
const VUSA = 40

function filled(type: TransactionTypeTag): EditorDraft {
  const config = TRANSACTION_TYPE_CONFIG[type]
  const differentAccounts = config.rules.some(
    (rule) => rule.kind === "differentAccounts"
  )
  const sameAsset = config.rules.some((rule) => rule.kind === "sameAsset")

  let draft = emptyDraft({ date: DATE, dateText: "26 Jul 2026", type })
  draft = setSlot(draft, "primary", {
    accountId: ACCOUNT_A,
    assetId: GBP,
    amountText: "200",
    entryId: 11,
  })
  draft = setSlot(draft, "counter", {
    accountId: differentAccounts ? ACCOUNT_B : ACCOUNT_A,
    assetId: sameAsset ? GBP : VUSA,
    amountText: "200",
    entryId: 12,
  })

  return {
    ...draft,
    categoryId: 7,
    description: "Tesco",
    originAssetId: VUSA,
  }
}

describe("the candidate assembler", () => {
  it.each(TRANSACTION_TYPES)("names exactly the wire fields of %s", (type) => {
    const schemaFields = Object.keys(transactionInputSchemas[type].shape).sort(
      (a, b) => a.localeCompare(b)
    )
    expect(candidateFieldNames(type)).toEqual(schemaFields)
  })

  it.each(TRANSACTION_TYPES)(
    "builds a valid %s from a filled draft",
    (type) => {
      const result = validateTransactionInputOfType(
        type,
        buildCandidate(type, filled(type))
      )
      expect(result.ok ? null : result.issues).toBeNull()
    }
  )

  it("covers all thirteen types, not the design's twelve", () => {
    expect(TRANSACTION_TYPES).toHaveLength(13)
    expect(TRANSACTION_TYPES).toContain("cash_balance_transfer")
  })

  it("applies each slot's required sign rather than trusting the typed sign", () => {
    const candidate = buildCandidate(
      "cash_balance_transfer",
      filled("cash_balance_transfer")
    ) as unknown as Extract<TransactionInput, { type: "cash_balance_transfer" }>
    expect(candidate.outgoing_change.amount).toBe(-200)
    expect(candidate.incoming_change.amount).toBe(200)
  })

  it("signs a purchase's units in and its cash out from one typed magnitude", () => {
    const candidate = buildCandidate(
      "asset_purchase",
      filled("asset_purchase")
    ) as unknown as Extract<TransactionInput, { type: "asset_purchase" }>
    expect(candidate.purchase_change.amount).toBe(200)
    expect(candidate.cash_outgoings_change.amount).toBe(-200)
  })

  it("lets a purchase carry a sign but never a category or description", () => {
    const candidate = buildCandidate("asset_purchase", filled("asset_purchase"))
    expect(Object.keys(candidate)).not.toContain("category_id")
    expect(Object.keys(candidate)).not.toContain("description")
  })

  it("turns a blank description into undefined, never an empty string", () => {
    const draft = { ...filled("regular"), description: "   " }
    const candidate = buildCandidate("regular", draft) as unknown as Record<
      string,
      unknown
    >
    expect(candidate.description).toBeUndefined()
  })

  it("carries entry ids only into the update payload", () => {
    const draft = filled("regular")
    const create = buildCandidate("regular", draft) as unknown as {
      entry: Record<string, unknown>
    }
    expect(create.entry.entry_id).toBeUndefined()

    const update = buildUpdatePayload("regular", draft) as unknown as {
      entry: Record<string, unknown>
    }
    expect(update.entry.entry_id).toBe(11)
  })

  it.each(TRANSACTION_TYPES)(
    "keeps the update payload of %s valid against the input schema",
    (type) => {
      const result = validateTransactionInputOfType(
        type,
        buildUpdatePayload(type, filled(type))
      )
      expect(result.ok).toBe(true)
    }
  )

  it("sends fees as negative amounts whatever magnitude was typed", () => {
    const draft: EditorDraft = {
      ...filled("regular"),
      fees: [
        {
          key: "fee-1",
          accountId: ACCOUNT_A,
          assetId: GBP,
          amountText: "1.50",
          feeType: "transaction",
          entryId: 99,
        },
      ],
    }
    const candidate = buildCandidate("regular", draft) as unknown as {
      fees: { amount: number }[]
    }
    expect(candidate.fees[0]?.amount).toBe(-1.5)

    const update = buildUpdatePayload("regular", draft) as unknown as {
      fees: { entry_id: number }[]
    }
    expect(update.fees[0]?.entry_id).toBe(99)
  })
})
