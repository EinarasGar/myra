import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { AIConversationsApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { NormalizedRateLimitedError } from "@/lib/errors"
import { normalizeError } from "@/lib/errors"
import {
  queryKeys,
  withNormalizedErrors,
  type ConversationId,
} from "@/lib/query"

import { INTERRUPTED } from "../copy"
import { buildTranscript, transcriptTail } from "./history"
import { useConversationMessages } from "./queries"
import { streamChatTurn, type ChatTurnRequest } from "./stream"
import {
  applyChatEvent,
  decideProposals,
  dropTrailingErrors,
  failRunningTools,
} from "./transcript"
import type { ChatPart, ChatTurn } from "./types"

export interface ChatAttachment {
  readonly fileId: string
  readonly name: string
}

export interface MyraChat {
  readonly conversationId: ConversationId | null
  readonly turns: readonly ChatTurn[]
  readonly isStreaming: boolean
  readonly isLoadingHistory: boolean
  readonly historyFailed: boolean
  readonly rateLimit: NormalizedRateLimitedError | null
  readonly canRetry: boolean
  send: (
    message: string,
    askedFrom?: string | null,
    attachments?: readonly ChatAttachment[]
  ) => void
  respond: (toolCallIds: readonly string[], approved: boolean) => void
  retry: () => void
  stop: () => void
  startNewChat: () => void
  openConversation: (conversationId: ConversationId) => void
  dismissRateLimit: () => void
}

interface TranscriptState {
  readonly hydratedFor: string | null
  readonly turns: readonly ChatTurn[]
}

let turnCounter = 0

function nextTurnId(prefix: string): string {
  turnCounter += 1
  return `${prefix}-${String(turnCounter)}`
}

function hydrate(
  messages: Parameters<typeof buildTranscript>[0]
): readonly ChatTurn[] {
  const restored = buildTranscript(messages)
  const tail = transcriptTail(messages)
  return tail.interrupted && !tail.awaitingApproval
    ? withInterruptionNote(restored)
    : restored
}

export function useMyraChat(userId: string): MyraChat {
  const queryClient = useQueryClient()
  const [conversationId, setConversationId] = useState<ConversationId | null>(
    null
  )
  const [transcript, setTranscript] = useState<TranscriptState>({
    hydratedFor: null,
    turns: [],
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const [rateLimit, setRateLimit] = useState<NormalizedRateLimitedError | null>(
    null
  )
  const abortRef = useRef<AbortController | null>(null)

  const history = useConversationMessages(userId, conversationId)
  const historyData = history.data

  if (
    conversationId !== null &&
    transcript.hydratedFor !== conversationId &&
    historyData !== undefined
  ) {
    setTranscript({
      hydratedFor: conversationId,
      turns: hydrate(historyData),
    })
  }

  const turns = transcript.turns

  const setTurns = useCallback(
    (update: (previous: readonly ChatTurn[]) => readonly ChatTurn[]) => {
      setTranscript((previous) => ({
        ...previous,
        turns: update(previous.turns),
      }))
    },
    []
  )

  const patchLastTurn = useCallback(
    (update: (parts: readonly ChatPart[]) => readonly ChatPart[]) => {
      setTurns((previous) => {
        const last = previous[previous.length - 1]
        if (last === undefined) return previous
        return [
          ...previous.slice(0, -1),
          { ...last, parts: update(last.parts) },
        ]
      })
    },
    [setTurns]
  )

  const invalidateAfterTurn = useCallback(() => {
    const keys = queryKeys.user(userId)
    for (const key of [
      keys.transactions.all(),
      keys.portfolio.all(),
      keys.accounts.all(),
      keys.assets.all(),
      keys.ai.conversations.all(),
    ]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }, [queryClient, userId])

  const ensureConversation = useCallback(async (): Promise<ConversationId> => {
    if (conversationId !== null) return conversationId
    const created = await withNormalizedErrors(async () => {
      const response = await api(AIConversationsApiFactory).createConversation(
        userId
      )
      return response.data.id
    })
    setTranscript((previous) => ({ ...previous, hydratedFor: created }))
    setConversationId(created)
    return created
  }, [conversationId, userId])

  const run = useCallback(
    async (request: ChatTurnRequest, optimisticTurns: number) => {
      const controller = new AbortController()
      abortRef.current = controller
      setIsStreaming(true)
      setRateLimit(null)

      try {
        const id = await ensureConversation()
        await streamChatTurn({
          userId,
          conversationId: id,
          request,
          signal: controller.signal,
          onEvent: (event) => {
            patchLastTurn((parts) => applyChatEvent(parts, event, Date.now()))
          },
        })
      } catch (error) {
        const normalized = normalizeError(error)
        if (normalized.kind === "canceled") {
          patchLastTurn(failRunningTools)
        } else if (
          normalized.kind === "rateLimited" &&
          request.kind === "message" &&
          optimisticTurns > 0
        ) {
          setRateLimit(normalized)
          setTurns((previous) => previous.slice(0, -optimisticTurns))
        } else if (normalized.kind === "rateLimited") {
          setRateLimit(normalized)
          patchLastTurn(failRunningTools)
        } else if (normalized.kind === "conflict" && request.kind === "retry") {
          patchLastTurn(failRunningTools)
        } else {
          patchLastTurn((parts) => [
            ...failRunningTools(parts),
            {
              kind: "error",
              message: normalized.message,
              resetAt: null,
              retryable: normalized.kind !== "validation",
            },
          ])
        }
      } finally {
        patchLastTurn(failRunningTools)
        setIsStreaming(false)
        abortRef.current = null
        invalidateAfterTurn()
      }
    },
    [ensureConversation, invalidateAfterTurn, patchLastTurn, setTurns, userId]
  )

  const send = useCallback(
    (
      message: string,
      askedFrom: string | null = null,
      attachments: readonly ChatAttachment[] = []
    ) => {
      const text = message.trim()
      if ((text === "" && attachments.length === 0) || isStreaming) return
      const at = Date.now()
      const label =
        text === ""
          ? attachments.map((attachment) => attachment.name).join(", ")
          : text
      setTurns((previous) => [
        ...previous,
        {
          id: nextTurnId("user"),
          role: "user",
          parts: [{ kind: "text", text: label }],
          at,
          askedFrom,
        },
        {
          id: nextTurnId("assistant"),
          role: "assistant",
          parts: [],
          at,
          askedFrom: null,
        },
      ])
      void run(
        {
          kind: "message",
          message: text,
          fileIds: attachments.map((attachment) => attachment.fileId),
        },
        2
      )
    },
    [isStreaming, run, setTurns]
  )

  const respond = useCallback(
    (toolCallIds: readonly string[], approved: boolean) => {
      if (isStreaming || toolCallIds.length === 0) return
      setTurns((previous) =>
        previous.map((turn) => ({
          ...turn,
          parts: decideProposals(
            turn.parts,
            toolCallIds,
            approved ? "approved" : "denied"
          ),
        }))
      )
      void run(
        {
          kind: "approval",
          approvals: toolCallIds.map((id) => ({
            tool_call_id: id,
            approved,
          })),
        },
        0
      )
    },
    [isStreaming, run, setTurns]
  )

  const retry = useCallback(() => {
    if (isStreaming || conversationId === null) return
    setTurns((previous) => {
      const last = previous[previous.length - 1]
      if (last?.role === "assistant") {
        return [
          ...previous.slice(0, -1),
          { ...last, parts: dropTrailingErrors(last.parts) },
        ]
      }
      return [
        ...previous,
        {
          id: nextTurnId("assistant"),
          role: "assistant",
          parts: [],
          at: Date.now(),
          askedFrom: null,
        },
      ]
    })
    void run({ kind: "retry" }, 0)
  }, [conversationId, isStreaming, run, setTurns])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const startNewChat = useCallback(() => {
    abortRef.current?.abort()
    setConversationId(null)
    setTranscript({ hydratedFor: null, turns: [] })
    setRateLimit(null)
  }, [])

  const openConversation = useCallback((next: ConversationId) => {
    abortRef.current?.abort()
    setConversationId(next)
    setTranscript({ hydratedFor: null, turns: [] })
    setRateLimit(null)
  }, [])

  const dismissRateLimit = useCallback(() => {
    setRateLimit(null)
  }, [])

  const lastTurn = turns[turns.length - 1]
  const canRetry =
    !isStreaming &&
    conversationId !== null &&
    lastTurn?.role === "assistant" &&
    lastTurn.parts.some((part) => part.kind === "error" && part.retryable)

  return {
    conversationId,
    turns,
    isStreaming,
    isLoadingHistory: conversationId !== null && history.isPending,
    historyFailed: history.isError,
    rateLimit,
    canRetry,
    send,
    respond,
    retry,
    stop,
    startNewChat,
    openConversation,
    dismissRateLimit,
  }
}

function withInterruptionNote(turns: readonly ChatTurn[]): readonly ChatTurn[] {
  const last = turns[turns.length - 1]
  const note: ChatPart = {
    kind: "error",
    message: INTERRUPTED,
    resetAt: null,
    retryable: true,
  }
  if (last?.role === "assistant") {
    return [...turns.slice(0, -1), { ...last, parts: [...last.parts, note] }]
  }
  return [
    ...turns,
    {
      id: nextTurnId("assistant"),
      role: "assistant",
      parts: [note],
      at: Date.now(),
      askedFrom: null,
    },
  ]
}
