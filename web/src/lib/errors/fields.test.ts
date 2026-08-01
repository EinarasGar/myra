import { AxiosError, AxiosHeaders } from "axios"
import { describe, expect, it } from "vitest"

import { hasFieldError, toFieldErrors, toFormErrors } from "./fields"
import {
  interpretFieldMessage,
  SERDE_FALLBACK_MESSAGES,
  FALLBACK_MESSAGES,
} from "./messages"
import type { FieldError } from "./types"

function validation(errors: FieldError[], status = 422, message?: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    config,
    {},
    {
      status,
      statusText: "",
      data: {
        error_type: "ValidationError",
        message: message ?? "One or more fields failed validation.",
        errors,
      },
      headers: new AxiosHeaders(),
      config,
    }
  )
}

describe("toFieldErrors", () => {
  it("groups the flat array by field", () => {
    const grouped = toFieldErrors(
      validation([
        { field: "entry.amount", message: "Must be a positive value." },
        {
          field: "entry.account_id",
          message: "Entries must reference different accounts.",
        },
        { field: "entry.amount", message: "Must not exceed the balance." },
      ])
    )

    expect(grouped).toEqual({
      "entry.amount": [
        "Must be a positive value.",
        "Must not exceed the balance.",
      ],
      "entry.account_id": ["Entries must reference different accounts."],
    })
  })

  it("preserves indexed paths verbatim", () => {
    const grouped = toFieldErrors(
      validation([
        {
          field: "identifiers[1].value",
          message: "Card last 4 must be exactly 4 digits.",
        },
      ])
    )

    expect(Object.keys(grouped)).toEqual(["identifiers[1].value"])
  })

  it("returns nothing for non-validation errors", () => {
    expect(toFieldErrors(new Error("boom"))).toEqual({})
  })

  it("answers hasFieldError", () => {
    const error = validation([
      {
        field: "original_name",
        message: "File name must be between 1 and 255 characters.",
      },
    ])

    expect(hasFieldError(error, "original_name")).toBe(true)
    expect(hasFieldError(error, "mime_type")).toBe(false)
  })
})

describe("toFormErrors", () => {
  it("separates the serde flatten `body` blob into a form-level banner", () => {
    const result = toFormErrors(
      validation([
        {
          field: "body",
          message:
            "Failed to deserialize the JSON body into the target type: Must be between 1 and 200 characters. at line 1 column 69",
        },
      ])
    )

    expect(result.fieldErrors).toEqual({})
    expect(result.formErrors).toEqual(["Must be between 1 and 200 characters."])
    expect(result.hasUnmappableErrors).toBe(true)
  })

  it("surfaces a 400 ValidationError with an empty errors array as a banner", () => {
    const result = toFormErrors(
      validation([], 400, "A rate for this date already exists.")
    )

    expect(result.formErrors).toEqual(["A rate for this date already exists."])
    expect(result.hasUnmappableErrors).toBe(true)
  })

  it("routes the untagged-enum trap to the banner, not to a field", () => {
    const result = toFormErrors(
      validation([
        {
          field: "transaction",
          message:
            "data did not match any variant of untagged enum TransactionWithEntries",
        },
      ])
    )

    expect(result.fieldErrors).toEqual({})
    expect(result.formErrors).toEqual([SERDE_FALLBACK_MESSAGES.untaggedEnum])
    expect(result.hasUnmappableErrors).toBe(true)
  })

  it("routes the query-string rejection to the banner", () => {
    const result = toFormErrors(
      validation([
        {
          field: "query",
          message:
            "Failed to deserialize query string: limit: invalid digit found in string",
        },
      ])
    )

    expect(result.formErrors).toEqual([SERDE_FALLBACK_MESSAGES.queryString])
  })

  it("substitutes caller copy for serde-derived per-field noise", () => {
    const result = toFormErrors(
      validation([
        { field: "original_name", message: "missing field `original_name`" },
        {
          field: "size_bytes",
          message: 'invalid type: string "x", expected i64',
        },
      ]),
      { fieldMessages: { size_bytes: "Enter the file size in bytes." } }
    )

    expect(result.fieldErrors).toEqual({
      original_name: [SERDE_FALLBACK_MESSAGES.missingField],
      size_bytes: ["Enter the file size in bytes."],
    })
  })

  it("keeps server copy that is already user-presentable", () => {
    const result = toFormErrors(
      validation([
        {
          field: "original_name",
          message: "File name must be between 1 and 255 characters.",
        },
      ]),
      { fieldMessages: { original_name: "never used" } }
    )

    expect(result.fieldErrors.original_name).toEqual([
      "File name must be between 1 and 255 characters.",
    ])
  })

  it("reports a non-validation failure as a single banner message", () => {
    const result = toFormErrors(new Error("boom"))

    expect(result).toEqual({
      fieldErrors: {},
      formErrors: [FALLBACK_MESSAGES.unknown],
      hasUnmappableErrors: false,
    })
  })

  it("accepts a caller-supplied form-level field set", () => {
    const result = toFormErrors(
      validation([
        {
          field: "transactions",
          message: "At least one transaction is required.",
        },
      ]),
      { formLevelFields: ["transactions"] }
    )

    expect(result.formErrors).toEqual(["At least one transaction is required."])
  })
})

describe("interpretFieldMessage", () => {
  it.each([
    ["missing field `original_name`", "missingField"],
    ['invalid type: string "x", expected i64', "invalidType"],
    ["unknown field `nope`, expected one of", "unknownField"],
    [
      "data did not match any variant of untagged enum TransactionWithEntries",
      "untaggedEnum",
    ],
    [
      "Failed to parse the request body as JSON: EOF while parsing an object at line 1 column 1",
      "malformedJson",
    ],
    ["Expected request with `Content-Type: application/json`", "contentType"],
    [
      "Invalid URL: Cannot parse `account_id` with value `not-a-uuid`: UUID parsing failed",
      "pathParam",
    ],
  ])("classifies %s as serde noise", (message, serdeKind) => {
    const interpreted = interpretFieldMessage(message)

    expect(interpreted.presentable).toBe(false)
    expect(interpreted.serdeKind).toBe(serdeKind)
    expect(interpreted.raw).toBe(message)
  })

  it("unwraps a user-presentable message hidden behind the serde prefix", () => {
    const interpreted = interpretFieldMessage(
      "Failed to deserialize the JSON body into the target type: Must be between 1 and 200 characters. at line 1 column 69"
    )

    expect(interpreted).toMatchObject({
      presentable: true,
      message: "Must be between 1 and 200 characters.",
    })
  })

  it("passes through plain server sentences", () => {
    expect(interpretFieldMessage("Must be a positive value.")).toMatchObject({
      presentable: true,
      message: "Must be a positive value.",
    })
  })

  it.each([
    "no rows returned by a query that expected to return at least one row",
    "Invalid user_id",
    "error returned from database: duplicate key value violates unique constraint",
    "Account { id: 4 } is not yours",
    "called `Option::unwrap()` on a `None` value",
  ])("never shows the user a raw backend string like %s", (message) => {
    const interpreted = interpretFieldMessage(message)

    expect(interpreted.presentable).toBe(false)
    expect(interpreted.message).toBe(SERDE_FALLBACK_MESSAGES.opaque)
    expect(interpreted.raw).toBe(message)
  })

  it("still lets a sentence a person wrote through", () => {
    for (const message of [
      "A rate for this date already exists.",
      "Account not found.",
      "File status must be pending to confirm upload.",
      "At least one transaction is required",
      "One or more transactions were concurrently assigned to another group",
    ]) {
      expect(interpretFieldMessage(message)).toMatchObject({
        presentable: true,
        message,
      })
    }
  })
})
