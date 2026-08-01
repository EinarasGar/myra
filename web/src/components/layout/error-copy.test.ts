import { describe, expect, it } from "vitest"

import { normalizeHttpError } from "@/lib/errors"

import { retryAfterCopy } from "./error-copy"

const ISO_PATTERN = /\d{4}-\d{2}-\d{2}T/

function aiRateLimit(resetAt: string) {
  return normalizeHttpError({
    status: 429,
    data: {
      error_type: "RateLimited",
      message: "Rate limit exceeded.",
      errors: [],
      details: {
        kind: "rate_limited",
        message: "AI usage limit reached.",
        reset_at: resetAt,
        scope: "user",
      },
    },
  })
}

describe("retryAfterCopy", () => {
  it("prefers the retry-after header over the reset timestamp", () => {
    const error = normalizeHttpError({
      status: 429,
      data: "Too Many Requests! Wait for 45s",
      headers: { "retry-after": "45" },
    })
    expect(retryAfterCopy(error)).toBe("Try again in 45s.")
  })

  it("renders a same-day reset as a time, never as an ISO timestamp", () => {
    const copy = retryAfterCopy(aiRateLimit("2026-07-30T22:00:00Z"), {
      now: new Date("2026-07-30T20:15:00Z"),
      timeZone: "UTC",
    })
    expect(copy).toBe("Resets at 22:00.")
    expect(copy).not.toMatch(ISO_PATTERN)
  })

  it("renders a reset on another day with its date", () => {
    const copy = retryAfterCopy(aiRateLimit("2026-08-01T06:30:00Z"), {
      now: new Date("2026-07-30T20:15:00Z"),
      timeZone: "UTC",
    })
    expect(copy).toBe("Resets at 1 Aug · 06:30.")
    expect(copy).not.toMatch(ISO_PATTERN)
  })

  it("decides same-day in the requested time zone, not the machine zone", () => {
    const copy = retryAfterCopy(aiRateLimit("2026-07-31T00:30:00Z"), {
      now: new Date("2026-07-30T23:30:00Z"),
      timeZone: "Pacific/Auckland",
    })
    expect(copy).toBe("Resets at 12:30.")
  })

  it("says nothing when the reset timestamp cannot be read", () => {
    expect(retryAfterCopy(aiRateLimit("not a date"))).toBeUndefined()
  })

  it("says nothing for errors that are not rate limits", () => {
    expect(retryAfterCopy(normalizeHttpError({ status: 500 }))).toBeUndefined()
  })
})
