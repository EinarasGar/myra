import { describe, expect, it } from "vitest"

import type { ApiErrorResponse } from "@/lib/errors"
import { FALLBACK_MESSAGES, normalizeHttpError } from "@/lib/errors"

import { emptyDraft, setSlot } from "./draft"
import { editorTypeView } from "./layout"
import {
  MISSING_ACCOUNT,
  MISSING_AMOUNT,
  MISSING_ASSET,
  MISSING_CATEGORY,
  serverErrors,
  SHAPE_REJECTED,
  validateDraft,
} from "./validation"
import { NON_ZERO_AMOUNT_MESSAGE } from "@/lib/domain/transaction-types"

const SEED = { date: 1_753_920_000, dateText: "26 Jul 2026" }
const ACCOUNT = "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f"

function httpError(status: number, body: ApiErrorResponse) {
  return normalizeHttpError({ status, data: body })
}

describe("client-side validation", () => {
  it("names every empty control instead of leaking a schema type error", () => {
    const view = editorTypeView("regular")
    const result = validateDraft(view, emptyDraft({ ...SEED, type: "regular" }))

    expect(result.ok).toBe(false)
    expect(result.fieldErrors["entry.account_id"]).toEqual([MISSING_ACCOUNT])
    expect(result.fieldErrors["entry.asset_id"]).toEqual([MISSING_ASSET])
    expect(result.fieldErrors["entry.amount"]).toEqual([MISSING_AMOUNT])
    expect(result.fieldErrors.category_id).toEqual([MISSING_CATEGORY])
  })

  it("applies the domain's own sign rule with the domain's own message", () => {
    const view = editorTypeView("regular")
    let draft = emptyDraft({ ...SEED, type: "regular" })
    draft = setSlot(draft, "primary", {
      accountId: ACCOUNT,
      assetId: 1,
      amountText: "0",
    })
    const result = validateDraft(view, { ...draft, categoryId: 7 })

    expect(result.fieldErrors["entry.amount"]).toEqual([
      NON_ZERO_AMOUNT_MESSAGE,
    ])
  })

  it("reports a cross-field rule against both sides, as the server does", () => {
    const view = editorTypeView("cash_balance_transfer")
    let draft = emptyDraft({ ...SEED, type: "cash_balance_transfer" })
    draft = setSlot(draft, "primary", {
      accountId: ACCOUNT,
      assetId: 1,
      amountText: "200",
    })
    draft = setSlot(draft, "counter", {
      accountId: ACCOUNT,
      assetId: 1,
      amountText: "200",
    })

    const result = validateDraft(view, draft)
    const message =
      "outgoing_change.account_id and incoming_change.account_id must reference different accounts."
    expect(result.fieldErrors["outgoing_change.account_id"]).toEqual([message])
    expect(result.fieldErrors["incoming_change.account_id"]).toEqual([message])
  })
})

describe("server errors", () => {
  it("attaches a field error to the input that produced it", () => {
    const errors = serverErrors(
      httpError(422, {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors: [
          { field: "entry.amount", message: "Must be a positive value." },
        ],
      })
    )

    expect(errors.fieldErrors["entry.amount"]).toEqual([
      "Must be a positive value.",
    ])
    expect(errors.formErrors).toEqual([])
  })

  it("turns the untagged-enum blob into a banner that says what happened", () => {
    const errors = serverErrors(
      httpError(422, {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors: [
          {
            field: "transaction",
            message:
              "data did not match any variant of untagged enum TransactionWithEntries",
          },
        ],
      })
    )

    expect(errors.formErrors).toEqual([SHAPE_REJECTED])
    expect(Object.keys(errors.fieldErrors)).toEqual([])
  })

  it("surfaces a ValidationError with no field errors rather than swallowing it", () => {
    const errors = serverErrors(
      httpError(400, {
        error_type: "ValidationError",
        message: "A rate for this date already exists.",
        errors: [],
      })
    )

    expect(errors.formErrors).toEqual(["A rate for this date already exists."])
  })

  it("banners curated copy instead of a server string naming a backend field", () => {
    const errors = serverErrors(
      httpError(400, {
        error_type: "ValidationError",
        message: "Invalid user_id",
        errors: [],
      })
    )

    expect(errors.formErrors).toEqual([FALLBACK_MESSAGES.validation])
  })

  it("keeps a flattened body error as a banner", () => {
    const errors = serverErrors(
      httpError(422, {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors: [
          {
            field: "body",
            message:
              "Failed to deserialize the JSON body into the target type: Must be between 1 and 500 characters. at line 1 column 69",
          },
        ],
      })
    )

    expect(errors.formErrors).toHaveLength(1)
    expect(Object.keys(errors.fieldErrors)).toEqual([])
  })

  it("has nothing to say before a request has failed", () => {
    expect(serverErrors(null)).toEqual({ fieldErrors: {}, formErrors: [] })
  })
})
