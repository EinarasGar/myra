import { describe, expect, it } from "vitest"

import type { AiChatStreamEvent } from "@/lib/sse"

import {
  applyChatEvent,
  decideProposals,
  dropTrailingErrors,
  failRunningTools,
} from "./transcript"
import type { ChatPart, ToolPart } from "./types"

function reduce(events: readonly AiChatStreamEvent[]): readonly ChatPart[] {
  return events.reduce<readonly ChatPart[]>(
    (parts, event, index) => applyChatEvent(parts, event, 1000 + index),
    []
  )
}

describe("applyChatEvent", () => {
  it("joins consecutive text chunks into one part rather than one per frame", () => {
    const parts = reduce([
      { type: "text", text: "You spent " },
      { type: "text", text: "£42.18" },
    ])
    expect(parts).toEqual([{ kind: "text", text: "You spent £42.18" }])
  })

  it("keeps reasoning separate from the answer text", () => {
    const parts = reduce([
      { type: "reasoning", text: "checking" },
      { type: "text", text: "answer" },
      { type: "reasoning", text: "more" },
    ])
    expect(parts.map((part) => part.kind)).toEqual([
      "reasoning",
      "text",
      "reasoning",
    ])
  })

  it("settles a tool result against the newest running call of that name", () => {
    const parts = reduce([
      { type: "tool_call", callId: "a", name: "get_holdings", input: {} },
      { type: "tool_call", callId: "b", name: "get_holdings", input: {} },
      { type: "tool_result", name: "get_holdings", output: "{}" },
    ])
    const tools = parts.filter((part): part is ToolPart => part.kind === "tool")
    expect(tools.map((tool) => [tool.callId, tool.phase])).toEqual([
      ["a", "running"],
      ["b", "done"],
    ])
  })

  it("leaves an unmatched tool result alone rather than inventing a call", () => {
    const parts = reduce([
      { type: "tool_result", name: "get_holdings", output: "{}" },
    ])
    expect(parts).toEqual([])
  })

  it("stringifies a non-string tool output so the raw pane can show it", () => {
    const parts = reduce([
      { type: "tool_call", callId: "a", name: "list_accounts", input: {} },
      { type: "tool_result", name: "list_accounts", output: { rows: 2 } },
    ])
    expect((parts[0] as ToolPart).output).toBe('{"rows":2}')
  })

  it("turns a gated call into a pending proposal and drops its work line", () => {
    const parts = reduce([
      {
        type: "tool_call",
        callId: "c1",
        name: "create_transaction",
        input: { amount: 1 },
      },
      {
        type: "tool_request",
        toolCallId: "c1",
        name: "create_transaction",
        args: { amount: 1 },
      },
    ])
    expect(parts).toEqual([
      {
        kind: "proposal",
        toolCallId: "c1",
        name: "create_transaction",
        args: { amount: 1 },
        decision: "pending",
      },
    ])
  })

  it("records a mid-stream error event with its reset time", () => {
    const parts = applyChatEvent(
      [],
      {
        type: "error",
        error: { kind: "rateLimited", message: "Slow down.", source: "ai" },
        details: {
          kind: "rate_limited",
          message: "Slow down.",
          reset_at: "2026-07-31T10:00:00Z",
        },
      },
      1
    )
    expect(parts).toEqual([
      {
        kind: "error",
        message: "Slow down.",
        resetAt: "2026-07-31T10:00:00Z",
        retryable: true,
      },
    ])
  })
})

describe("decideProposals", () => {
  it("marks only the named proposals", () => {
    const parts: ChatPart[] = [
      {
        kind: "proposal",
        toolCallId: "a",
        name: "x",
        args: {},
        decision: "pending",
      },
      {
        kind: "proposal",
        toolCallId: "b",
        name: "x",
        args: {},
        decision: "pending",
      },
    ]
    const next = decideProposals(parts, ["a"], "denied")
    expect(
      next.map((part) => (part.kind === "proposal" ? part.decision : null))
    ).toEqual(["denied", "pending"])
  })
})

describe("dropTrailingErrors", () => {
  it("removes only the errors at the end so a retry does not delete the answer", () => {
    const parts: ChatPart[] = [
      { kind: "text", text: "partial" },
      { kind: "error", message: "boom", resetAt: null, retryable: true },
      { kind: "error", message: "boom", resetAt: null, retryable: true },
    ]
    expect(dropTrailingErrors(parts)).toEqual([
      { kind: "text", text: "partial" },
    ])
  })
})

describe("failRunningTools", () => {
  it("stops a spinner that will never receive its result", () => {
    const parts: ChatPart[] = [
      {
        kind: "tool",
        callId: "a",
        name: "get_holdings",
        input: {},
        output: null,
        phase: "running",
        at: 1,
      },
    ]
    expect((failRunningTools(parts)[0] as ToolPart).phase).toBe("failed")
  })
})
