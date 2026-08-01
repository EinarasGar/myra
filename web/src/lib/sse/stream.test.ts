import { afterEach, describe, expect, it, vi } from "vitest"

import { registerAuthTokenGetter } from "@/lib/api"

import { parseAiChatEvent, parseQuickUploadEvent } from "./events"
import type { SseMessage } from "./parser"
import { openSseStream } from "./stream"

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.()
})

function sseResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
    ...init,
  })
}

function errorResponse(
  status: number,
  body: string,
  contentType = "application/json"
) {
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  })
}

describe("openSseStream", () => {
  it("streams events and sends the bearer token", async () => {
    cleanups.push(registerAuthTokenGetter(() => "token-1"))
    const fetchImpl = vi.fn(async () =>
      sseResponse("event: text\ndata: Hello\n\nevent: done\ndata: \n\n")
    )
    const messages: SseMessage[] = []

    await openSseStream({
      path: "/api/users/u1/ai/conversations/c1/messages",
      method: "POST",
      body: { message: "hi" },
      onMessage: (message) => messages.push(message),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(messages.map((message) => message.event)).toEqual(["text", "done"])

    const [, requestInit] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    const headers = requestInit.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer token-1")
    expect(headers.Accept).toBe("text/event-stream")
    expect(headers["Content-Type"]).toBe("application/json")
    expect(requestInit.body).toBe('{"message":"hi"}')
  })

  it("rejects with a normalized error when the stream never starts", async () => {
    const fetchImpl = vi.fn(async () =>
      errorResponse(
        429,
        JSON.stringify({
          error_type: "RateLimited",
          message: "Rate limit exceeded.",
          errors: [],
          details: {
            kind: "rate_limited",
            message: "AI usage limit reached.",
            reset_at: "2026-07-30T22:00:00Z",
          },
        })
      )
    )

    await expect(
      openSseStream({
        path: "/api/users/u1/ai/conversations/c1/messages",
        method: "POST",
        onMessage: () => undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({
      kind: "rateLimited",
      source: "ai",
      resetAt: "2026-07-30T22:00:00Z",
    })
  })

  it("surfaces the plain-text unrouted 404 as a normalized error", async () => {
    const fetchImpl = vi.fn(async () =>
      errorResponse(404, "nothing to see here", "text/plain")
    )

    await expect(
      openSseStream({
        path: "/api/users/u1/ai/quick-upload/q1/subscribe",
        onMessage: () => undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ kind: "notFound", unrouted: true })
  })

  it("refuses to reconnect a POST stream", async () => {
    await expect(
      openSseStream({
        path: "/api/users/u1/ai/conversations/c1/messages",
        method: "POST",
        reconnect: true,
        onMessage: () => undefined,
        fetchImpl: vi.fn() as unknown as typeof fetch,
      })
    ).rejects.toThrow(/duplicate the turn/)
  })

  it("reconnects a GET subscription after a transport failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(sseResponse("event: done\ndata: \n\n"))
    const messages: SseMessage[] = []

    await openSseStream({
      path: "/api/users/u1/ai/quick-upload/q1/subscribe",
      reconnect: { maxAttempts: 2, initialDelayMs: 0, maxDelayMs: 0 },
      onMessage: (message) => messages.push(message),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(messages.map((message) => message.event)).toEqual(["done"])
  })

  it("gives up once the attempt budget is spent", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(
      openSseStream({
        path: "/api/users/u1/ai/quick-upload/q1/subscribe",
        reconnect: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
        onMessage: () => undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ kind: "network", reason: "unreachable" })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("does not reconnect after a validation failure", async () => {
    const fetchImpl = vi.fn(async () =>
      errorResponse(
        422,
        JSON.stringify({
          error_type: "ValidationError",
          message: "One or more fields failed validation.",
          errors: [{ field: "message", message: "Must not be empty." }],
        })
      )
    )

    await expect(
      openSseStream({
        path: "/api/users/u1/ai/quick-upload/q1/subscribe",
        reconnect: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 },
        onMessage: () => undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ kind: "validation" })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("resolves quietly when the caller aborts", async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () => {
      controller.abort()
      throw Object.assign(new Error("aborted"), { name: "AbortError" })
    })

    await expect(
      openSseStream({
        path: "/api/users/u1/ai/quick-upload/q1/subscribe",
        signal: controller.signal,
        onMessage: () => undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toBeUndefined()
  })
})

describe("mid-stream error events", () => {
  it("delivers the AI error event as a normalized error", async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse(
        'event: error\ndata: {"kind":"provider_unavailable","message":"The AI provider is temporarily unavailable."}\n\n'
      )
    )
    const events: ReturnType<typeof parseAiChatEvent>[] = []

    await openSseStream({
      path: "/api/users/u1/ai/conversations/c1/messages",
      method: "POST",
      onMessage: (message) => events.push(parseAiChatEvent(message)),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(events[0]).toMatchObject({
      type: "error",
      error: { kind: "serverError", transient: true },
      details: { kind: "provider_unavailable" },
    })
  })

  it("parses quick-upload progress events", async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse(
        'event: state\ndata: {"id":"q1","status":"processing"}\n\n' +
          'event: status\ndata: {"step":"extracting"}\n\n' +
          'event: proposal\ndata: {"proposal_type":"transactions","data":{"rows":2}}\n\n' +
          "event: done\ndata: \n\n"
      )
    )
    const events: ReturnType<typeof parseQuickUploadEvent>[] = []

    await openSseStream({
      path: "/api/users/u1/ai/quick-upload/q1/subscribe",
      onMessage: (message) => events.push(parseQuickUploadEvent(message)),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(events).toEqual([
      { type: "state", state: { id: "q1", status: "processing" } },
      { type: "status", step: "extracting" },
      {
        type: "proposal",
        proposalType: "transactions",
        data: { rows: 2 },
      },
      { type: "done" },
    ])
  })
})
