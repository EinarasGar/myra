import { describe, expect, it } from "vitest"

import type { IdentifiableMessageResponse } from "@/api"

import { buildTranscript, transcriptTail } from "./history"

let clock = 0

function message(
  content: Record<string, unknown>,
  role = "assistant"
): IdentifiableMessageResponse {
  clock += 1
  return {
    id: `m${String(clock)}`,
    role,
    content,
    file_ids: [],
    created_at: new Date(Date.UTC(2026, 6, 31, 9, clock)).toISOString(),
  }
}

describe("buildTranscript", () => {
  it("reads the stored discriminator, not the role column", () => {
    const turns = buildTranscript([
      message({ type: "user", content: "hello" }, "anything"),
      message({ type: "assistant", content: "hi" }, "anything"),
    ])
    expect(turns.map((turn) => turn.role)).toEqual(["user", "assistant"])
  })

  it("merges every assistant part of one answer into a single turn", () => {
    const turns = buildTranscript([
      message({ type: "user", content: "spend?" }, "user"),
      message({
        type: "assistant_tool_call",
        tool_call_id: "c1",
        name: "aggregate_transactions",
        args: '{"group_by":"category"}',
      }),
      message({ type: "tool_result", tool_call_id: "c1", content: "{}" }),
      message({ type: "assistant", content: "£412.50 on groceries." }),
    ])
    expect(turns).toHaveLength(2)
    expect(turns[1]?.parts.map((part) => part.kind)).toEqual(["tool", "text"])
  })

  it("parses the stored args string back into the object the card reads", () => {
    const turns = buildTranscript([
      message({
        type: "assistant_tool_call",
        tool_call_id: "c1",
        name: "aggregate_transactions",
        args: '{"group_by":"month"}',
      }),
      message({ type: "tool_result", tool_call_id: "c1", content: "{}" }),
    ])
    const part = turns[0]?.parts[0]
    expect(part?.kind === "tool" ? part.input : null).toEqual({
      group_by: "month",
    })
  })

  it("restores a still-pending write as a proposal, not as completed work", () => {
    const turns = buildTranscript([
      message({
        type: "assistant_tool_call",
        tool_call_id: "c9",
        name: "create_transaction",
        args: "{}",
      }),
    ])
    expect(turns[0]?.parts[0]).toEqual({
      kind: "proposal",
      toolCallId: "c9",
      name: "create_transaction",
      args: {},
      decision: "pending",
    })
  })

  it("restores a denied write as denied so the receipt survives a reload", () => {
    const turns = buildTranscript([
      message({
        type: "assistant_tool_call",
        tool_call_id: "c9",
        name: "create_transaction",
        args: "{}",
      }),
      message({ type: "tool_approval", tool_call_id: "c9", approved: false }),
    ])
    const part = turns[0]?.parts[0]
    expect(part?.kind === "proposal" ? part.decision : null).toBe("denied")
  })
})

describe("transcriptTail", () => {
  it("calls a chat that ends on assistant text complete", () => {
    expect(
      transcriptTail([message({ type: "assistant", content: "done" })])
    ).toEqual({ interrupted: false, awaitingApproval: false })
  })

  it("calls a chat that ends on the user's message interrupted", () => {
    expect(
      transcriptTail([message({ type: "user", content: "hi" }, "user")])
    ).toEqual({ interrupted: true, awaitingApproval: false })
  })

  it("distinguishes a dangling write, which is waiting on the user, from a failure", () => {
    expect(
      transcriptTail([
        message({
          type: "assistant_tool_call",
          tool_call_id: "c1",
          name: "create_transaction",
          args: "{}",
        }),
      ])
    ).toEqual({ interrupted: true, awaitingApproval: true })
  })
})
