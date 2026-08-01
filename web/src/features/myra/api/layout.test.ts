import { describe, expect, it } from "vitest"

import { layoutTurn, workSummary } from "./layout"
import type { ChatPart, ToolPart } from "./types"

function tool(
  callId: string,
  name: string,
  phase: ToolPart["phase"]
): ToolPart {
  return {
    kind: "tool",
    callId,
    name,
    input: {},
    output: phase === "done" ? "{}" : null,
    phase,
    at: 1,
  }
}

describe("layoutTurn", () => {
  it("collapses consecutive tool calls into one work block", () => {
    const parts: ChatPart[] = [
      tool("a", "list_accounts", "done"),
      tool("b", "get_holdings", "done"),
      { kind: "text", text: "You hold three funds." },
    ]
    const blocks = layoutTurn(parts)
    expect(blocks.map((block) => block.kind)).toEqual(["work", "text"])
    expect(blocks[0]?.kind === "work" ? blocks[0].steps.length : 0).toBe(2)
  })

  it("starts a second work block after prose so the order the user saw is kept", () => {
    const blocks = layoutTurn([
      tool("a", "list_accounts", "done"),
      { kind: "text", text: "Checking…" },
      tool("b", "get_holdings", "done"),
    ])
    expect(blocks.map((block) => block.kind)).toEqual(["work", "text", "work"])
  })

  it("drops whitespace-only prose rather than rendering an empty paragraph", () => {
    expect(layoutTurn([{ kind: "text", text: "   " }])).toEqual([])
  })

  it("gives every block a stable key", () => {
    const blocks = layoutTurn([
      tool("a", "list_accounts", "done"),
      {
        kind: "proposal",
        toolCallId: "p1",
        name: "create_transaction",
        args: {},
        decision: "pending",
      },
    ])
    expect(blocks.map((block) => block.id)).toEqual(["work:a", "proposal:p1"])
  })
})

describe("workSummary", () => {
  it("names one tool once and counts repeats", () => {
    expect(workSummary([tool("a", "get_holdings", "done")])).toEqual({
      title: "get_holdings",
      meta: "1 call",
      running: false,
      failed: false,
    })
  })

  it("lists the distinct tools when a turn used several", () => {
    const summary = workSummary([
      tool("a", "list_accounts", "done"),
      tool("b", "get_holdings", "running"),
    ])
    expect(summary.title).toBe("2 tool calls")
    expect(summary.meta).toBe("list_accounts, get_holdings")
    expect(summary.running).toBe(true)
  })

  it("reports a failure over a success so the line never claims work that broke", () => {
    const summary = workSummary([
      tool("a", "get_holdings", "done"),
      tool("b", "get_holdings", "failed"),
    ])
    expect(summary.failed).toBe(true)
  })
})
