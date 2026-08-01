import { describe, expect, it } from "vitest"

import type { NormalizedUnauthorizedError } from "@/lib/errors"

import { isRefreshExhausted } from "./database-session"

function unauthorized(
  config: Record<string, unknown>
): NormalizedUnauthorizedError {
  return {
    kind: "unauthorized",
    message: "Unauthorized",
    status: 401,
    cause: Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      config,
      response: { status: 401 },
    }),
  }
}

describe("isRefreshExhausted", () => {
  it("leaves the first 401 to the refresh interceptor", () => {
    expect(isRefreshExhausted(unauthorized({ url: "/api/accounts" }))).toBe(
      false
    )
  })

  it("reports a replayed request that is still rejected", () => {
    expect(
      isRefreshExhausted(
        unauthorized({ url: "/api/accounts", authRetried: true })
      )
    ).toBe(true)
  })

  it("reports a rejected refresh call", () => {
    expect(isRefreshExhausted(unauthorized({ url: "/api/auth/refresh" }))).toBe(
      true
    )
  })

  it("ignores errors that are not a server 401", () => {
    expect(isRefreshExhausted(new Error("offline"))).toBe(false)
    expect(
      isRefreshExhausted({
        kind: "serverError",
        message: "boom",
        transient: false,
      })
    ).toBe(false)
  })
})
