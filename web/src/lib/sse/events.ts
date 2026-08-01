import type { AiErrorDetails, NormalizedError } from "@/lib/errors"
import { isAiErrorDetails, normalizeAiError } from "@/lib/errors"

import type { SseMessage } from "./parser"

interface AiStreamErrorEvent {
  type: "error"
  error: NormalizedError
  details?: AiErrorDetails
}

interface SseUnknownEvent {
  type: "unknown"
  event: string
  data: string
}

export type AiChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: "tool_call"
      callId: string
      name: string
      input: unknown
      signature?: string
    }
  | { type: "tool_result"; name: string; output: unknown }
  | { type: "tool_request"; toolCallId: string; name: string; args: unknown }
  | AiStreamErrorEvent
  | { type: "done" }
  | SseUnknownEvent

export type QuickUploadStreamEvent =
  | { type: "state"; state: unknown }
  | { type: "status"; step: string }
  | { type: "proposal"; proposalType: string; data: unknown }
  | AiStreamErrorEvent
  | { type: "done" }
  | SseUnknownEvent

export function parseAiChatEvent(message: SseMessage): AiChatStreamEvent {
  switch (message.event) {
    case "text":
      return { type: "text", text: message.data }
    case "reasoning":
      return { type: "reasoning", text: message.data }
    case "done":
      return { type: "done" }
    case "error":
      return errorEvent(message)
    case "tool_call": {
      const payload = parseJson(message.data)
      const callId = readString(payload, "call_id")
      const name = readString(payload, "name")
      if (callId === undefined || name === undefined)
        return unknownEvent(message)
      const signature = readString(payload, "signature")
      return {
        type: "tool_call",
        callId,
        name,
        input: readValue(payload, "input"),
        ...(signature === undefined ? {} : { signature }),
      }
    }
    case "tool_result": {
      const payload = parseJson(message.data)
      const name = readString(payload, "name")
      if (name === undefined) return unknownEvent(message)
      return { type: "tool_result", name, output: readValue(payload, "output") }
    }
    case "tool_request": {
      const payload = parseJson(message.data)
      const toolCallId = readString(payload, "tool_call_id")
      const name = readString(payload, "name")
      if (toolCallId === undefined || name === undefined)
        return unknownEvent(message)
      return {
        type: "tool_request",
        toolCallId,
        name,
        args: readValue(payload, "args"),
      }
    }
    default:
      return unknownEvent(message)
  }
}

export function parseQuickUploadEvent(
  message: SseMessage
): QuickUploadStreamEvent {
  switch (message.event) {
    case "state": {
      const state = parseJson(message.data)
      if (state === undefined) return unknownEvent(message)
      return { type: "state", state }
    }
    case "status": {
      const step = readString(parseJson(message.data), "step")
      if (step === undefined) return unknownEvent(message)
      return { type: "status", step }
    }
    case "proposal": {
      const payload = parseJson(message.data)
      const proposalType = readString(payload, "proposal_type")
      if (proposalType === undefined) return unknownEvent(message)
      return {
        type: "proposal",
        proposalType,
        data: readValue(payload, "data"),
      }
    }
    case "error":
      return errorEvent(message)
    case "done":
      return { type: "done" }
    default:
      return unknownEvent(message)
  }
}

function errorEvent(message: SseMessage): AiStreamErrorEvent {
  const payload = parseJson(message.data)
  return {
    type: "error",
    error: normalizeAiError(payload),
    ...(isAiErrorDetails(payload) ? { details: payload } : {}),
  }
}

function unknownEvent(message: SseMessage): SseUnknownEvent {
  return { type: "unknown", event: message.event, data: message.data }
}

function parseJson(data: string): unknown {
  if (data.trim() === "") return undefined
  try {
    return JSON.parse(data) as unknown
  } catch {
    return undefined
  }
}

function readValue(payload: unknown, key: string): unknown {
  if (typeof payload !== "object" || payload === null) return undefined
  return (payload as Record<string, unknown>)[key]
}

function readString(payload: unknown, key: string): string | undefined {
  const value = readValue(payload, key)
  return typeof value === "string" ? value : undefined
}
