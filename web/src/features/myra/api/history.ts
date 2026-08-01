import type { IdentifiableMessageResponse } from "@/api"

import type { ChatPart, ChatTurn, ProposalDecision } from "./types"

interface StoredMessage {
  readonly id: string
  readonly at: number
  readonly type: string
  readonly content: Record<string, unknown>
}

export interface TranscriptTail {
  readonly interrupted: boolean
  readonly awaitingApproval: boolean
}

export function buildTranscript(
  messages: readonly IdentifiableMessageResponse[]
): readonly ChatTurn[] {
  const stored = messages.map(toStoredMessage)
  const results = new Map<string, string>()
  const decisions = new Map<string, ProposalDecision>()

  for (const message of stored) {
    const callId = readString(message.content, "tool_call_id")
    if (callId === undefined) continue
    if (message.type === "tool_result") {
      results.set(callId, readString(message.content, "content") ?? "")
    }
    if (message.type === "tool_approval") {
      decisions.set(
        callId,
        message.content.approved === true ? "approved" : "denied"
      )
    }
  }

  const turns: ChatTurn[] = []

  const appendAssistant = (message: StoredMessage, part: ChatPart) => {
    const last = turns[turns.length - 1]
    if (last?.role === "assistant") {
      turns[turns.length - 1] = { ...last, parts: [...last.parts, part] }
      return
    }
    turns.push({
      id: message.id,
      role: "assistant",
      parts: [part],
      at: message.at,
      askedFrom: null,
    })
  }

  for (const message of stored) {
    if (message.type === "user") {
      turns.push({
        id: message.id,
        role: "user",
        parts: [
          { kind: "text", text: readString(message.content, "content") ?? "" },
        ],
        at: message.at,
        askedFrom: null,
      })
      continue
    }

    if (message.type === "assistant") {
      const text = readString(message.content, "content")
      if (text === undefined) continue
      appendAssistant(message, { kind: "text", text })
      continue
    }

    if (message.type !== "assistant_tool_call") continue

    const callId = readString(message.content, "tool_call_id")
    const name = readString(message.content, "name")
    if (callId === undefined || name === undefined) continue
    const input = parseArgs(message.content.args)
    const output = results.get(callId)
    const decision = decisions.get(callId)

    if (output !== undefined && decision === undefined) {
      appendAssistant(message, {
        kind: "tool",
        callId,
        name,
        input,
        output,
        phase: "done",
        at: message.at,
      })
      continue
    }

    appendAssistant(message, {
      kind: "proposal",
      toolCallId: callId,
      name,
      args: input,
      decision: decision ?? "pending",
    })
  }

  return turns
}

export function transcriptTail(
  messages: readonly IdentifiableMessageResponse[]
): TranscriptTail {
  const last = messages[messages.length - 1]
  if (last === undefined) return { interrupted: false, awaitingApproval: false }
  const type = toStoredMessage(last).type
  if (type === "assistant")
    return { interrupted: false, awaitingApproval: false }
  return {
    interrupted: true,
    awaitingApproval: type === "assistant_tool_call",
  }
}

function toStoredMessage(message: IdentifiableMessageResponse): StoredMessage {
  const content = asRecord(message.content) ?? {}
  return {
    id: message.id,
    at: Date.parse(message.created_at),
    type: readString(content, "type") ?? message.role,
    content,
  }
}

function parseArgs(raw: unknown): unknown {
  if (typeof raw !== "string") return raw
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return {}
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function readString(
  source: Record<string, unknown>,
  key: string
): string | undefined {
  const value = source[key]
  return typeof value === "string" ? value : undefined
}
