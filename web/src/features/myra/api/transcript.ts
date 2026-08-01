import type { AiChatStreamEvent } from "@/lib/sse"

import type {
  ChatPart,
  ProposalDecision,
  ProposalPart,
  ToolPart,
} from "./types"

export function applyChatEvent(
  parts: readonly ChatPart[],
  event: AiChatStreamEvent,
  at: number
): readonly ChatPart[] {
  switch (event.type) {
    case "text":
      return appendProse(parts, "text", event.text)
    case "reasoning":
      return appendProse(parts, "reasoning", event.text)
    case "tool_call":
      return [
        ...parts,
        {
          kind: "tool",
          callId: event.callId,
          name: event.name,
          input: event.input,
          output: null,
          phase: "running",
          at,
        },
      ]
    case "tool_result":
      return settleTool(parts, event.name, event.output)
    case "tool_request":
      return promoteToProposal(parts, event.toolCallId, event.name, event.args)
    case "error":
      return [
        ...parts,
        {
          kind: "error",
          message: event.error.message,
          resetAt: event.details?.reset_at ?? null,
          retryable: event.error.kind !== "validation",
        },
      ]
    case "done":
    case "unknown":
      return parts
  }
}

export function decideProposals(
  parts: readonly ChatPart[],
  toolCallIds: readonly string[],
  decision: ProposalDecision
): readonly ChatPart[] {
  const targets = new Set(toolCallIds)
  return parts.map((part) =>
    part.kind === "proposal" && targets.has(part.toolCallId)
      ? { ...part, decision }
      : part
  )
}

export function dropTrailingErrors(
  parts: readonly ChatPart[]
): readonly ChatPart[] {
  let end = parts.length
  while (end > 0 && parts[end - 1]?.kind === "error") end -= 1
  return parts.slice(0, end)
}

export function failRunningTools(
  parts: readonly ChatPart[]
): readonly ChatPart[] {
  return parts.map((part) =>
    part.kind === "tool" && part.phase === "running"
      ? { ...part, phase: "failed" as const }
      : part
  )
}

function appendProse(
  parts: readonly ChatPart[],
  kind: "text" | "reasoning",
  chunk: string
): readonly ChatPart[] {
  const last = parts[parts.length - 1]
  if (last?.kind === kind) {
    return [...parts.slice(0, -1), { kind, text: last.text + chunk }]
  }
  return [...parts, { kind, text: chunk }]
}

// The server's tool_result event carries the tool name but never the call id it
// answers, so the newest running call of that name is the only sound match.
function settleTool(
  parts: readonly ChatPart[],
  name: string,
  output: unknown
): readonly ChatPart[] {
  const index = lastIndex(
    parts,
    (part): part is ToolPart =>
      part.kind === "tool" && part.phase === "running" && part.name === name
  )
  const fallback =
    index === -1
      ? lastIndex(
          parts,
          (part): part is ToolPart =>
            part.kind === "tool" && part.phase === "running"
        )
      : index
  if (fallback === -1) return parts

  const target = parts[fallback] as ToolPart
  const next = [...parts]
  next[fallback] = {
    ...target,
    output: toOutputText(output),
    phase: "done",
  }
  return next
}

function promoteToProposal(
  parts: readonly ChatPart[],
  toolCallId: string,
  name: string,
  args: unknown
): readonly ChatPart[] {
  const proposal: ProposalPart = {
    kind: "proposal",
    toolCallId,
    name,
    args,
    decision: "pending",
  }
  const existing = parts.findIndex(
    (part) => part.kind === "tool" && part.callId === toolCallId
  )
  if (existing === -1) return [...parts, proposal]
  return [...parts.slice(0, existing), ...parts.slice(existing + 1), proposal]
}

function toOutputText(output: unknown): string {
  if (typeof output === "string") return output
  if (output === undefined) return ""
  try {
    return JSON.stringify(output)
  } catch {
    return ""
  }
}

function lastIndex<T extends ChatPart>(
  parts: readonly ChatPart[],
  match: (part: ChatPart) => part is T
): number {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]
    if (part !== undefined && match(part)) return index
  }
  return -1
}
