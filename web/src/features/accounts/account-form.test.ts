import { describe, expect, it } from "vitest"

import { normalizeError } from "@/lib/errors"

import type { AccountDetail } from "./api"
import {
  accountFormFromDetail,
  accountServerErrors,
  emptyAccountForm,
  formatSharePercent,
  identifierRowErrors,
  identifierValueError,
  normaliseIdentifierValue,
  parseSharePercent,
  sharePercentToFraction,
  validateAccountForm,
  NAME_REQUIRED,
  SHARE_REQUIRED,
  SHARE_TOO_HIGH,
  SHARE_TOO_LOW,
  SHARE_UNREADABLE,
} from "./account-form"

function validationError(errors: { field: string; message: string }[]) {
  return normalizeError({
    response: {
      status: 422,
      data: {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors,
      },
    },
    isAxiosError: true,
  })
}

function form(overrides: Partial<ReturnType<typeof baseForm>> = {}) {
  return { ...baseForm(), ...overrides }
}

function baseForm() {
  return {
    ...emptyAccountForm({ accountTypeId: 1, liquidityTypeId: 1 }),
    name: "Lloyds Current",
  }
}

describe("the ownership share a human types", () => {
  it("reads a bare percentage", () => {
    expect(parseSharePercent("50")).toEqual({ percent: 50, error: null })
  })

  it("forgives a typed percent sign, spaces and a decimal comma", () => {
    expect(parseSharePercent(" 33,3 % ")).toEqual({
      percent: 33.3,
      error: null,
    })
  })

  it("names each way it can be wrong rather than silently clamping", () => {
    expect(parseSharePercent("").error).toBe(SHARE_REQUIRED)
    expect(parseSharePercent("half").error).toBe(SHARE_UNREADABLE)
    expect(parseSharePercent("0").error).toBe(SHARE_TOO_LOW)
    expect(parseSharePercent("101").error).toBe(SHARE_TOO_HIGH)
  })

  it("converts to the fraction the server stores without float noise", () => {
    expect(sharePercentToFraction(33.3)).toBe(0.333)
    expect(sharePercentToFraction(100)).toBe(1)
    expect(sharePercentToFraction(0.5)).toBe(0.005)
  })

  it("renders a stored fraction back as a typeable percentage", () => {
    expect(formatSharePercent(0.333)).toBe("33.3")
    expect(formatSharePercent(1)).toBe("100")
    expect(formatSharePercent(0.5)).toBe("50")
  })
})

describe("identifier values", () => {
  it("normalises the way the server does before validating", () => {
    expect(
      normaliseIdentifierValue("iban", "gb29 nwbk 6016 1331 9268 19")
    ).toBe("GB29NWBK60161331926819")
    expect(normaliseIdentifierValue("account_number", "1234-5678 90")).toBe(
      "1234567890"
    )
    expect(normaliseIdentifierValue("card_last4", " 0042 ")).toBe("0042")
  })

  it("accepts what the server accepts and rejects what it rejects", () => {
    expect(identifierValueError("card_last4", "0042")).toBeNull()
    expect(identifierValueError("card_last4", "123")).not.toBeNull()
    expect(identifierValueError("account_number", "1234567890")).toBeNull()
    expect(identifierValueError("account_number", "12")).not.toBeNull()
    expect(identifierValueError("iban", "GB29NWBK60161331926819")).toBeNull()
    expect(identifierValueError("iban", "GBXX12345678901234")).not.toBeNull()
  })
})

describe("validating the whole form", () => {
  it("builds the request body the API expects", () => {
    const result = validateAccountForm(
      form({
        sharePercent: "50",
        identifiers: [
          { key: "k1", kind: "iban", value: "gb29 nwbk 6016 1331 9268 19" },
        ],
      })
    )

    expect(result.ok).toBe(true)
    expect(result.payload).toEqual({
      name: "Lloyds Current",
      account_type: 1,
      liquidity_type: 1,
      ownership_share: 0.5,
      identifiers: [{ kind: "iban", value: "GB29NWBK60161331926819" }],
    })
  })

  it("trims the name and refuses an empty one", () => {
    expect(validateAccountForm(form({ name: "   " })).fieldErrors.name).toEqual(
      [NAME_REQUIRED]
    )
    expect(
      validateAccountForm(form({ name: "  Trimmed  " })).payload?.name
    ).toBe("Trimmed")
  })

  it("puts an identifier error on the row that carries it", () => {
    const result = validateAccountForm(
      form({
        identifiers: [
          { key: "k1", kind: "iban", value: "GB29NWBK60161331926819" },
          { key: "k2", kind: "card_last4", value: "12" },
        ],
      })
    )

    expect(result.ok).toBe(false)
    expect(result.fieldErrors["identifiers[0].value"]).toBeUndefined()
    expect(result.fieldErrors["identifiers[1].value"]).toHaveLength(1)
  })

  it("catches a duplicate identifier on the second row, as the server does", () => {
    const result = validateAccountForm(
      form({
        identifiers: [
          { key: "k1", kind: "card_last4", value: "4291" },
          { key: "k2", kind: "card_last4", value: "4291" },
        ],
      })
    )

    expect(identifierRowErrors(result.fieldErrors, 0)).toEqual([])
    expect(identifierRowErrors(result.fieldErrors, 1)).toEqual([
      "Duplicate identifier.",
    ])
  })

  it("never returns a payload while any field is wrong", () => {
    const result = validateAccountForm(form({ name: "", sharePercent: "0" }))
    expect(result.payload).toBeNull()
  })
})

describe("seeding the form from a saved account", () => {
  const detail: AccountDetail = {
    accountId: "a1",
    name: "Joint Bills",
    accountTypeId: 1,
    accountTypeName: "Current",
    accountClass: "cash",
    isLiquid: true,
    isLiability: false,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 0.5,
    ownershipSharePercent: 50,
    isJoint: true,
    identifiers: [{ kind: "card_last4", value: "4291" }],
  }

  it("shows the stored share as a percentage", () => {
    const seeded = accountFormFromDetail(detail)
    expect(seeded.sharePercent).toBe("50")
    expect(seeded.identifiers[0]?.value).toBe("4291")
  })

  it("round-trips back to the same request body when nothing is touched", () => {
    const result = validateAccountForm(accountFormFromDetail(detail))
    expect(result.payload).toEqual({
      name: "Joint Bills",
      account_type: 1,
      liquidity_type: 1,
      ownership_share: 0.5,
      identifiers: [{ kind: "card_last4", value: "4291" }],
    })
  })
})

describe("mapping the server's field errors back onto inputs", () => {
  it("keeps indexed identifier paths pointing at their row", () => {
    const mapped = accountServerErrors(
      validationError([
        {
          field: "identifiers[0].value",
          message:
            "IBAN must be 15–34 chars: 2 letters, 2 digits, then letters/digits.",
        },
        {
          field: "identifiers[1].value",
          message: "Card last 4 must be exactly 4 digits.",
        },
      ])
    )

    expect(identifierRowErrors(mapped.fieldErrors, 0)).toEqual([
      "IBAN must be 15–34 chars: 2 letters, 2 digits, then letters/digits.",
    ])
    expect(identifierRowErrors(mapped.fieldErrors, 1)).toEqual([
      "Card last 4 must be exactly 4 digits.",
    ])
    expect(mapped.formErrors).toEqual([])
  })

  it("recovers the name from the flattened body error", () => {
    const mapped = accountServerErrors(
      validationError([
        {
          field: "body",
          message:
            "Failed to deserialize the JSON body into the target type: Must be between 1 and 200 characters. at line 1 column 69",
        },
      ])
    )

    expect(mapped.fieldErrors.name).toEqual([
      "Must be between 1 and 200 characters.",
    ])
    expect(mapped.formErrors).toEqual([])
  })

  it("leaves unreadable body noise at form level instead of blaming the name", () => {
    const mapped = accountServerErrors(
      validationError([
        {
          field: "body",
          message:
            "Failed to parse the request body as JSON: EOF while parsing an object at line 1 column 1",
        },
      ])
    )

    expect(mapped.fieldErrors.name).toBeUndefined()
    expect(mapped.formErrors).toHaveLength(1)
  })

  it("keeps the ownership share message on its own input", () => {
    const mapped = accountServerErrors(
      validationError([
        {
          field: "ownership_share",
          message: "Must be between 0 (exclusive) and 1 (inclusive).",
        },
      ])
    )

    expect(mapped.fieldErrors.ownership_share).toEqual([
      "Must be between 0 (exclusive) and 1 (inclusive).",
    ])
  })

  it("falls back to a banner when the failure is not a validation one", () => {
    const mapped = accountServerErrors(
      normalizeError({
        response: {
          status: 409,
          data: {
            error_type: "Conflict",
            message: "User has no base currency set",
            errors: [],
          },
        },
        isAxiosError: true,
      })
    )

    expect(mapped.fieldErrors).toEqual({})
    expect(mapped.formErrors).toEqual(["User has no base currency set"])
  })
})
