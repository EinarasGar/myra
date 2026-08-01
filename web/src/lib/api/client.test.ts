import type { AxiosRequestConfig } from "axios"
import globalAxios from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountsApiFactory } from "@/api"
import { isRetryableError, type NormalizedError } from "@/lib/errors"

import { apiClient } from "./client"
import { api } from "./factories"
import {
  ApiConfigurationError,
  resolveApiBaseUrl,
  resolveApiUrl,
} from "./config"
import {
  getAuthHeaders,
  registerAuthTokenGetter,
  registerUnauthorizedHandler,
} from "./credentials"

const echoAdapter: AxiosRequestConfig["adapter"] = async (config) => ({
  data: { url: config.url, headers: config.headers },
  status: 200,
  statusText: "OK",
  headers: {},
  config,
})

function failingAdapter(
  status: number,
  data: unknown
): AxiosRequestConfig["adapter"] {
  return async (config) => {
    throw Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      config,
      response: { status, data, headers: {}, config, statusText: "" },
    })
  }
}

const unregisterCalls: Array<() => void> = []

afterEach(() => {
  while (unregisterCalls.length > 0) unregisterCalls.pop()?.()
})

describe("resolveApiBaseUrl", () => {
  it("treats empty and root values as same-origin", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("")
    expect(resolveApiBaseUrl("")).toBe("")
    expect(resolveApiBaseUrl("/")).toBe("")
  })

  it("strips trailing slashes from absolute and relative bases", () => {
    expect(resolveApiBaseUrl("https://api.sverto.com/")).toBe(
      "https://api.sverto.com"
    )
    expect(resolveApiBaseUrl("/gateway/")).toBe("/gateway")
  })

  it("rejects anything that is not a usable base", () => {
    expect(() => resolveApiBaseUrl("ftp://api.sverto.com")).toThrow(
      ApiConfigurationError
    )
    expect(() => resolveApiBaseUrl("not a url")).toThrow(ApiConfigurationError)
  })
})

describe("resolveApiUrl", () => {
  it("produces an absolute URL for SSE consumers", () => {
    expect(resolveApiUrl("/api/users/1/ai")).toBe(
      `${window.location.origin}/api/users/1/ai`
    )
    expect(resolveApiUrl("api/users/1/ai")).toBe(
      `${window.location.origin}/api/users/1/ai`
    )
  })
})

describe("apiClient", () => {
  it("never targets the generated hardcoded base path", () => {
    expect(apiClient.defaults.baseURL ?? "").not.toContain("localhost:5000")
  })

  it("attaches a bearer token from the registered getter", async () => {
    unregisterCalls.push(
      registerAuthTokenGetter(() => Promise.resolve("token-123"))
    )

    const response = await apiClient.request({
      url: "/api/auth/me",
      adapter: echoAdapter,
    })

    expect(response.data.headers.Authorization).toBe("Bearer token-123")
  })

  it("omits the header when no getter is registered", async () => {
    const response = await apiClient.request({
      url: "/api/auth/me",
      adapter: echoAdapter,
    })

    expect(response.data.headers.Authorization).toBeUndefined()
  })

  it("rejects with a normalized error and notifies unauthorized subscribers", async () => {
    const onUnauthorized = vi.fn()
    unregisterCalls.push(registerUnauthorizedHandler(onUnauthorized))

    await expect(
      apiClient.request({
        url: "/api/auth/me",
        adapter: failingAdapter(401, {
          error_type: "Unauthorized",
          message: "Unauthorized",
          errors: [],
        }),
      })
    ).rejects.toMatchObject({ kind: "unauthorized" })

    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it("does not treat a failure to obtain a token as a sign-out signal", async () => {
    const onUnauthorized = vi.fn()
    unregisterCalls.push(registerUnauthorizedHandler(onUnauthorized))
    unregisterCalls.push(
      registerAuthTokenGetter(() =>
        Promise.reject(new Error("identity provider unreachable"))
      )
    )

    const rejection = apiClient.request({
      url: "/api/auth/me",
      adapter: echoAdapter,
    })

    await expect(rejection).rejects.toMatchObject({
      kind: "network",
      reason: "unreachable",
    })
    expect(onUnauthorized).not.toHaveBeenCalled()
    await expect(
      rejection.catch((error: unknown) =>
        isRetryableError(error as NormalizedError)
      )
    ).resolves.toBe(true)
  })

  it("does not treat a 503 as a sign-out signal", async () => {
    const onUnauthorized = vi.fn()
    unregisterCalls.push(registerUnauthorizedHandler(onUnauthorized))

    await expect(
      apiClient.request({
        url: "/api/auth/me",
        adapter: failingAdapter(503, {
          error_type: "ServiceUnavailable",
          message: "Service temporarily unavailable.",
          errors: [],
        }),
      })
    ).rejects.toMatchObject({ kind: "serverError", transient: true })

    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe("generated factories bound through api()", () => {
  it("issue same-origin requests instead of hitting the generated base path", async () => {
    const previousAdapter = apiClient.defaults.adapter
    apiClient.defaults.adapter = echoAdapter
    try {
      const response = await api(AccountsApiFactory).getAccounts(
        "00000000-0000-0000-0000-000000000000"
      )

      const echoed = response.data as unknown as { url: string }
      expect(echoed.url).toBe(
        "/api/users/00000000-0000-0000-0000-000000000000/accounts"
      )
    } finally {
      apiClient.defaults.adapter = previousAdapter
    }
  })

  it("returns the same bound instance for a factory", () => {
    expect(api(AccountsApiFactory)).toBe(api(AccountsApiFactory))
  })
})

describe("global axios tripwire", () => {
  it("throws instead of silently calling localhost:5000", async () => {
    await expect(
      globalAxios.request({
        url: "http://localhost:5000/api/users",
        adapter: echoAdapter,
      })
    ).rejects.toThrow(/without the Sverto axios instance/)
  })
})

describe("getAuthHeaders", () => {
  it("mirrors the axios interceptor for fetch-based callers", async () => {
    expect(await getAuthHeaders()).toEqual({})

    unregisterCalls.push(registerAuthTokenGetter(() => "token-abc"))
    expect(await getAuthHeaders()).toEqual({
      Authorization: "Bearer token-abc",
    })
  })
})
