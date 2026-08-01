import { describe, expect, it } from "vitest"

import { parseAiChatEvent, parseQuickUploadEvent } from "./events"

describe("parseAiChatEvent", () => {
  it("treats text and reasoning payloads as raw strings", () => {
    expect(
      parseAiChatEvent({ event: "text", data: "Your net worth is" })
    ).toEqual({
      type: "text",
      text: "Your net worth is",
    })
    expect(parseAiChatEvent({ event: "reasoning", data: "thinking" })).toEqual({
      type: "reasoning",
      text: "thinking",
    })
  })

  it("parses tool_call including the optional signature", () => {
    expect(
      parseAiChatEvent({
        event: "tool_call",
        data: '{"call_id":"c1","name":"search_transactions","input":{"q":"tesco"},"signature":"sig"}',
      })
    ).toEqual({
      type: "tool_call",
      callId: "c1",
      name: "search_transactions",
      input: { q: "tesco" },
      signature: "sig",
    })
  })

  it("parses tool_result and tool_request", () => {
    expect(
      parseAiChatEvent({
        event: "tool_result",
        data: '{"name":"search","output":[1,2]}',
      })
    ).toEqual({ type: "tool_result", name: "search", output: [1, 2] })

    expect(
      parseAiChatEvent({
        event: "tool_request",
        data: '{"tool_call_id":"t1","name":"create","args":{"amount":5}}',
      })
    ).toEqual({
      type: "tool_request",
      toolCallId: "t1",
      name: "create",
      args: { amount: 5 },
    })
  })

  it("maps the mid-stream error event through the normaliser", () => {
    const event = parseAiChatEvent({
      event: "error",
      data: '{"kind":"rate_limited","message":"AI usage limit reached.","reset_at":"2026-07-30T22:00:00Z"}',
    })

    expect(event).toMatchObject({
      type: "error",
      error: {
        kind: "rateLimited",
        source: "ai",
        resetAt: "2026-07-30T22:00:00Z",
      },
    })
  })

  it("still yields an error event when the payload is unusable", () => {
    expect(parseAiChatEvent({ event: "error", data: "{}" })).toMatchObject({
      type: "error",
      error: { kind: "unknown" },
    })
  })

  it("reports done and unrecognised events without throwing", () => {
    expect(parseAiChatEvent({ event: "done", data: "" })).toEqual({
      type: "done",
    })
    expect(parseAiChatEvent({ event: "usage", data: "{}" })).toEqual({
      type: "unknown",
      event: "usage",
      data: "{}",
    })
    expect(parseAiChatEvent({ event: "tool_call", data: "not json" })).toEqual({
      type: "unknown",
      event: "tool_call",
      data: "not json",
    })
  })
})

describe("parseQuickUploadEvent", () => {
  it("falls back to unknown for malformed payloads", () => {
    expect(parseQuickUploadEvent({ event: "status", data: "{}" })).toEqual({
      type: "unknown",
      event: "status",
      data: "{}",
    })
    expect(parseQuickUploadEvent({ event: "state", data: "" })).toEqual({
      type: "unknown",
      event: "state",
      data: "",
    })
  })
})
