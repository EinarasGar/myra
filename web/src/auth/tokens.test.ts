import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

async function loadTokens() {
  vi.resetModules()
  return import("./tokens")
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("resolveAuthToken", () => {
  it("waits for the provider that arrives after the first request", async () => {
    const { provideAuthTokens, resolveAuthToken } = await loadTokens()

    const pending = resolveAuthToken()
    provideAuthTokens(() => Promise.resolve("token-123"))

    await expect(pending).resolves.toBe("token-123")
  })

  it("gives up instead of hanging when the provider never arrives", async () => {
    const {
      AUTH_TOKEN_DEADLINE_MS,
      AuthTokenUnavailableError,
      resolveAuthToken,
    } = await loadTokens()

    const outcome = vi.fn()
    const pending = resolveAuthToken().then(outcome, outcome)

    await vi.advanceTimersByTimeAsync(AUTH_TOKEN_DEADLINE_MS - 1)
    expect(outcome).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(outcome).toHaveBeenCalledWith(
      expect.any(AuthTokenUnavailableError) as unknown
    )
  })

  it("gives up when the provider itself never answers", async () => {
    const {
      AUTH_TOKEN_DEADLINE_MS,
      AuthTokenUnavailableError,
      provideAuthTokens,
      resolveAuthToken,
    } = await loadTokens()

    provideAuthTokens(() => new Promise<string | null>(() => {}))
    const outcome = vi.fn()
    const pending = resolveAuthToken().then(outcome, outcome)

    await vi.advanceTimersByTimeAsync(AUTH_TOKEN_DEADLINE_MS)
    await pending
    expect(outcome).toHaveBeenCalledWith(
      expect.any(AuthTokenUnavailableError) as unknown
    )
  })

  it("resolves anonymous without waiting when the provider has no credential", async () => {
    const { provideAuthTokens, resolveAuthToken } = await loadTokens()

    provideAuthTokens(null)

    await expect(resolveAuthToken()).resolves.toBeNull()
  })

  it("clears the deadline once a token has been produced", async () => {
    const { AUTH_TOKEN_DEADLINE_MS, provideAuthTokens, resolveAuthToken } =
      await loadTokens()

    provideAuthTokens(() => Promise.resolve("token-123"))
    await expect(resolveAuthToken()).resolves.toBe("token-123")

    await vi.advanceTimersByTimeAsync(AUTH_TOKEN_DEADLINE_MS * 2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
