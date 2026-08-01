import { AxiosError, AxiosHeaders } from "axios"
import { describe, expect, it } from "vitest"

import { FALLBACK_MESSAGES } from "./messages"
import {
  getErrorMessage,
  isNormalizedError,
  isRetryableError,
  normalizeAiError,
  normalizeError,
  normalizeHttpError,
} from "./normalize"

function axiosResponseError(
  status: number,
  data: unknown,
  headers: Record<string, string> = {}
) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    config,
    {},
    {
      status,
      statusText: "",
      data,
      headers: new AxiosHeaders(headers),
      config,
    }
  )
}

describe("normalizeError — enveloped responses", () => {
  it("maps a per-field 422 to a validation error keeping the flat array", () => {
    const body = {
      error_type: "ValidationError",
      message: "One or more fields failed validation.",
      errors: [
        {
          field: "original_name",
          message: "File name must be between 1 and 255 characters.",
        },
      ],
    }

    const error = normalizeError(axiosResponseError(422, body))

    expect(error).toMatchObject({
      kind: "validation",
      status: 422,
      errorType: "ValidationError",
      fieldErrors: body.errors,
    })
  })

  it("keeps multiple indexed field errors", () => {
    const body = {
      error_type: "ValidationError",
      message: "One or more fields failed validation.",
      errors: [
        {
          field: "identifiers[0].value",
          message:
            "IBAN must be 15–34 chars: 2 letters, 2 digits, then letters/digits.",
        },
        {
          field: "identifiers[1].value",
          message: "Card last 4 must be exactly 4 digits.",
        },
      ],
    }

    const error = normalizeError(axiosResponseError(422, body))

    expect(error.kind).toBe("validation")
    expect(error.kind === "validation" && error.fieldErrors).toHaveLength(2)
  })

  it("treats a 400 ValidationError with an empty errors array as form-level", () => {
    const body = {
      error_type: "ValidationError",
      message: "A rate for this date already exists.",
      errors: [],
    }

    const error = normalizeError(axiosResponseError(400, body))

    expect(error).toMatchObject({
      kind: "validation",
      status: 400,
      message: "A rate for this date already exists.",
      fieldErrors: [],
    })
  })

  it("swaps a server string that names a backend field for curated copy", () => {
    const error = normalizeError(
      axiosResponseError(400, {
        error_type: "ValidationError",
        message: "Invalid user_id",
        errors: [],
      })
    )

    expect(error.message).toBe(FALLBACK_MESSAGES.validation)
  })

  it("maps 404 with the server message", () => {
    const error = normalizeError(
      axiosResponseError(404, {
        error_type: "NotFound",
        message: "Account not found.",
        errors: [],
      })
    )

    expect(error).toMatchObject({
      kind: "notFound",
      message: "Account not found.",
      unrouted: false,
    })
  })

  it("maps 401 and 403", () => {
    expect(
      normalizeError(
        axiosResponseError(401, {
          error_type: "Unauthorized",
          message: "Unauthorized",
          errors: [],
        })
      ).kind
    ).toBe("unauthorized")

    expect(
      normalizeError(
        axiosResponseError(403, {
          error_type: "Forbidden",
          message: "Forbidden",
          errors: [],
        })
      ).kind
    ).toBe("forbidden")
  })

  it("maps 409 keeping the handler message", () => {
    const error = normalizeError(
      axiosResponseError(409, {
        error_type: "Conflict",
        message: "User has no base currency set",
        errors: [],
      })
    )

    expect(error).toMatchObject({
      kind: "conflict",
      message: "User has no base currency set",
    })
  })

  it("maps the enveloped AI 429 including reset_at", () => {
    const error = normalizeError(
      axiosResponseError(429, {
        error_type: "RateLimited",
        message: "Rate limit exceeded.",
        errors: [],
        details: {
          kind: "rate_limited",
          message: "AI usage limit reached.",
          reset_at: "2026-07-30T22:00:00Z",
          scope: "user",
        },
      })
    )

    expect(error).toMatchObject({
      kind: "rateLimited",
      source: "ai",
      message: "AI usage limit reached.",
      resetAt: "2026-07-30T22:00:00Z",
    })
  })

  it("maps a debug 500 without leaking the stack trace into the message", () => {
    const error = normalizeError(
      axiosResponseError(500, {
        error_type: "InternalServerError",
        message: "An internal server error occurred.",
        errors: [],
        stack_trace: "Account not found",
      })
    )

    expect(error).toMatchObject({
      kind: "serverError",
      transient: false,
      stackTrace: "Account not found",
    })
    expect(error.message).not.toContain("Account not found")
  })

  it("marks 502 and 503 as transient server errors", () => {
    const badGateway = normalizeError(
      axiosResponseError(502, {
        error_type: "BadGateway",
        message: "upstream provider returned 502",
        errors: [],
      })
    )
    const unavailable = normalizeError(
      axiosResponseError(503, {
        error_type: "ServiceUnavailable",
        message: "Service temporarily unavailable.",
        errors: [],
      })
    )

    expect(badGateway).toMatchObject({ kind: "serverError", transient: true })
    expect(unavailable).toMatchObject({ kind: "serverError", transient: true })
  })

  it("parses an envelope delivered as a raw JSON string body", () => {
    const error = normalizeError(
      axiosResponseError(
        404,
        '{"error_type":"NotFound","message":"Account not found.","errors":[]}'
      )
    )

    expect(error).toMatchObject({
      kind: "notFound",
      message: "Account not found.",
    })
  })
})

describe("normalizeError — responses without the envelope", () => {
  it("maps the text/plain unrouted 404", () => {
    const error = normalizeError(
      axiosResponseError(404, "nothing to see here", {
        "content-type": "text/plain",
      })
    )

    expect(error).toMatchObject({
      kind: "notFound",
      unrouted: true,
      detail: "nothing to see here",
      message: FALLBACK_MESSAGES.notFound,
    })
  })

  it("maps the axum path-param 400 to a form-level validation error", () => {
    const body =
      "Invalid URL: Cannot parse `account_id` with value `not-a-uuid`: UUID parsing failed: invalid character: found `n` at 0"

    const error = normalizeError(axiosResponseError(400, body))

    expect(error).toMatchObject({
      kind: "validation",
      status: 400,
      fieldErrors: [],
      detail: body,
    })
    expect(error.message).toBe(FALLBACK_MESSAGES.validation)
  })

  it("maps the empty-body 405", () => {
    const error = normalizeError(axiosResponseError(405, ""))

    expect(error).toMatchObject({ kind: "unknown", status: 405 })
  })

  it("maps the tower_governor plain-text 429 with retry-after", () => {
    const error = normalizeError(
      axiosResponseError(429, "Too Many Requests! Wait for 1s", {
        "retry-after": "1",
        "x-ratelimit-after": "1",
      })
    )

    expect(error).toMatchObject({
      kind: "rateLimited",
      source: "ip",
      retryAfterSeconds: 1,
    })
  })
})

describe("normalizeError — transport failures", () => {
  it("classifies a cancelled request", () => {
    const canceled = new Error("canceled")
    canceled.name = "CanceledError"

    expect(normalizeError(canceled).kind).toBe("canceled")
  })

  it("classifies an aborted fetch", () => {
    const aborted = new Error("The operation was aborted")
    aborted.name = "AbortError"

    expect(normalizeError(aborted).kind).toBe("canceled")
  })

  it("classifies a timeout", () => {
    const error = normalizeError(
      new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED", {
        headers: new AxiosHeaders(),
      })
    )

    expect(error).toMatchObject({ kind: "network", reason: "timeout" })
  })

  it("classifies an unreachable server", () => {
    const error = normalizeError(
      new AxiosError("Network Error", "ERR_NETWORK", {
        headers: new AxiosHeaders(),
      })
    )

    expect(error).toMatchObject({ kind: "network", reason: "unreachable" })
  })

  it("falls back to unknown for arbitrary throwables", () => {
    expect(normalizeError("boom")).toMatchObject({ kind: "unknown" })
    expect(normalizeError(undefined)).toMatchObject({ kind: "unknown" })
    expect(normalizeError(new Error("boom"))).toMatchObject({
      kind: "unknown",
      detail: "boom",
    })
  })

  it("is idempotent", () => {
    const once = normalizeError(new Error("boom"))
    expect(normalizeError(once)).toBe(once)
    expect(isNormalizedError(once)).toBe(true)
  })
})

describe("normalizeHttpError", () => {
  it("accepts a fetch Headers instance", () => {
    const error = normalizeHttpError({
      status: 429,
      data: "Too Many Requests! Wait for 3s",
      headers: new Headers({ "retry-after": "3" }),
    })

    expect(error).toMatchObject({
      kind: "rateLimited",
      source: "ip",
      retryAfterSeconds: 3,
    })
  })
})

describe("normalizeAiError", () => {
  it("maps the mid-stream provider_unavailable event", () => {
    const error = normalizeAiError({
      kind: "provider_unavailable",
      message: "The AI provider is temporarily unavailable.",
    })

    expect(error).toMatchObject({
      kind: "serverError",
      transient: true,
      message: "The AI provider is temporarily unavailable.",
    })
  })

  it("maps concurrency limits to a rate limit", () => {
    const error = normalizeAiError({
      kind: "concurrency_limited",
      message: "Another Myra turn is already running.",
      reset_at: "2026-07-30T22:00:00Z",
    })

    expect(error).toMatchObject({
      kind: "rateLimited",
      source: "ai",
      resetAt: "2026-07-30T22:00:00Z",
    })
  })

  it("maps input_too_large to a validation error", () => {
    expect(
      normalizeAiError({ kind: "input_too_large", message: "Too long." })
    ).toMatchObject({ kind: "validation", fieldErrors: [] })
  })

  it("falls back to unknown for an unrecognised payload", () => {
    expect(normalizeAiError({ nope: true })).toMatchObject({ kind: "unknown" })
  })
})

describe("isRetryableError", () => {
  it("retries server and transport errors only", () => {
    expect(
      isRetryableError(
        normalizeError(
          axiosResponseError(500, {
            error_type: "InternalServerError",
            message: "An internal server error occurred.",
            errors: [],
          })
        )
      )
    ).toBe(true)

    expect(
      isRetryableError(
        normalizeError(
          new AxiosError("Network Error", "ERR_NETWORK", {
            headers: new AxiosHeaders(),
          })
        )
      )
    ).toBe(true)

    expect(
      isRetryableError(
        normalizeError(
          axiosResponseError(404, {
            error_type: "NotFound",
            message: "Account not found.",
            errors: [],
          })
        )
      )
    ).toBe(false)

    expect(
      isRetryableError(
        normalizeError(
          axiosResponseError(429, "Too Many Requests! Wait for 1s")
        )
      )
    ).toBe(false)
  })
})

describe("getErrorMessage", () => {
  it("returns presentable copy for any throwable", () => {
    expect(getErrorMessage(new Error("kaboom"))).toBe(FALLBACK_MESSAGES.unknown)
  })
})
