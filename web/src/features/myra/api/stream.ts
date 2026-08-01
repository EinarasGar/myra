import {
  openSseStream,
  parseAiChatEvent,
  type AiChatStreamEvent,
} from "@/lib/sse"

export interface ToolApprovalPayload {
  readonly tool_call_id: string
  readonly approved: boolean
}

export type ChatTurnRequest =
  | {
      readonly kind: "message"
      readonly message: string
      readonly fileIds?: readonly string[]
    }
  | {
      readonly kind: "approval"
      readonly approvals: readonly ToolApprovalPayload[]
    }
  | { readonly kind: "retry" }

interface ChatStreamInit {
  readonly userId: string
  readonly conversationId: string
  readonly request: ChatTurnRequest
  readonly signal: AbortSignal
  readonly onEvent: (event: AiChatStreamEvent) => void
  readonly fetchImpl?: typeof fetch
}

function chatStreamPath(
  userId: string,
  conversationId: string,
  request: ChatTurnRequest
): string {
  const base = `/api/users/${userId}/ai/conversations/${conversationId}`
  return request.kind === "retry" ? `${base}/retry` : `${base}/messages`
}

export async function streamChatTurn(init: ChatStreamInit): Promise<void> {
  await openSseStream({
    path: chatStreamPath(init.userId, init.conversationId, init.request),
    method: "POST",
    ...(bodyFor(init.request) === undefined
      ? {}
      : { body: bodyFor(init.request) }),
    signal: init.signal,
    reconnect: false,
    onMessage: (message) => {
      init.onEvent(parseAiChatEvent(message))
    },
    ...(init.fetchImpl === undefined ? {} : { fetchImpl: init.fetchImpl }),
  })
}

function bodyFor(request: ChatTurnRequest): unknown {
  switch (request.kind) {
    case "message":
      return { message: request.message, file_ids: request.fileIds ?? [] }
    case "approval":
      return { tool_approvals: request.approvals }
    case "retry":
      return undefined
  }
}
