import { AxiosError, AxiosHeaders } from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"

import { normalizeError } from "@/lib/errors"

import { createQueryClient } from "./client"
import { subscribeToApiErrors } from "./error-reporter"

const unsubscribers: Array<() => void> = []

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.()
})

function httpError(status: number, data: unknown) {
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
      headers: new AxiosHeaders(),
      config,
    }
  )
}

function normalizedHttpError(status: number, data: unknown) {
  return normalizeError(httpError(status, data))
}

function retryPredicate(client = createQueryClient()) {
  const retry = client.getDefaultOptions().queries?.retry
  if (typeof retry !== "function") throw new Error("expected a retry predicate")
  return retry
}

describe("query defaults", () => {
  it("never retries client errors", () => {
    const retry = retryPredicate()
    const notFound = normalizedHttpError(404, {
      error_type: "NotFound",
      message: "Account not found.",
      errors: [],
    })
    const validation = normalizedHttpError(422, {
      error_type: "ValidationError",
      message: "One or more fields failed validation.",
      errors: [],
    })

    expect(retry(0, notFound)).toBe(false)
    expect(retry(0, validation)).toBe(false)
  })

  it("retries server and transport failures with a bounded count", () => {
    const retry = retryPredicate()
    const serverError = normalizedHttpError(500, {
      error_type: "InternalServerError",
      message: "An internal server error occurred.",
      errors: [],
    })

    expect(retry(0, serverError)).toBe(true)
    expect(retry(1, serverError)).toBe(true)
    expect(retry(2, serverError)).toBe(false)
  })

  it("does not retry rate limits", () => {
    const retry = retryPredicate()

    expect(
      retry(0, normalizedHttpError(429, "Too Many Requests! Wait for 1s"))
    ).toBe(false)
  })

  it("does not retry mutations", () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false)
  })

  it("does not refetch on window focus", () => {
    expect(
      createQueryClient().getDefaultOptions().queries?.refetchOnWindowFocus
    ).toBe(false)
  })
})

describe("global error reporting", () => {
  it("reports normalized query errors with their key", async () => {
    const seen = vi.fn()
    unsubscribers.push(subscribeToApiErrors(seen))
    const client = createQueryClient()

    await client
      .fetchQuery({
        queryKey: ["boom"],
        queryFn: () =>
          Promise.reject(
            httpError(409, {
              error_type: "Conflict",
              message: "User has no base currency set",
              errors: [],
            })
          ),
        retry: false,
      })
      .catch(() => undefined)

    expect(seen).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "query",
        queryKey: ["boom"],
        error: expect.objectContaining({ kind: "conflict" }),
      })
    )
  })

  it("stays silent for cancelled requests", async () => {
    const seen = vi.fn()
    unsubscribers.push(subscribeToApiErrors(seen))
    const client = createQueryClient()
    const canceled = new Error("canceled")
    canceled.name = "CanceledError"

    await client
      .fetchQuery({
        queryKey: ["canceled"],
        queryFn: () => Promise.reject(canceled),
        retry: false,
      })
      .catch(() => undefined)

    expect(seen).not.toHaveBeenCalled()
  })

  it("honours meta.suppressGlobalError", async () => {
    const seen = vi.fn()
    unsubscribers.push(subscribeToApiErrors(seen))
    const client = createQueryClient()

    await client
      .fetchQuery({
        queryKey: ["quiet"],
        queryFn: () => Promise.reject(new Error("boom")),
        meta: { suppressGlobalError: true },
        retry: false,
      })
      .catch(() => undefined)

    expect(seen).not.toHaveBeenCalled()
  })
})
