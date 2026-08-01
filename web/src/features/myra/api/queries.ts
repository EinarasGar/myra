import { useQuery } from "@tanstack/react-query"

import type {
  IdentifiableConversationResponse,
  IdentifiableMessageResponse,
} from "@/api"
import { AIConversationsApiFactory } from "@/api"
import { api } from "@/lib/api"
import {
  apiQueryOptions,
  queryKeys,
  STALE_TIMES,
  type ConversationId,
  type UserId,
} from "@/lib/query"
import type { AiUsageView } from "@/features/settings/api"
import { aiUsageQueryOptions } from "@/features/settings/api"

export interface ConversationSummary {
  readonly id: string
  readonly title: string | null
  readonly updatedAt: number
}

export interface ConversationGroup {
  readonly label: string
  readonly items: readonly ConversationSummary[]
}

export function conversationsQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).ai.conversations.list(),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<readonly ConversationSummary[]> => {
      const response = await api(AIConversationsApiFactory).listConversations(
        userId,
        { signal }
      )
      return response.data.map(toConversationSummary)
    },
    meta: { errorContext: "Your chats could not be loaded" },
  })
}

export function conversationMessagesQueryOptions(
  userId: UserId,
  conversationId: ConversationId | null
) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(userId)
      .ai.conversations.messages(conversationId ?? ""),
    staleTime: STALE_TIMES.short,
    enabled: conversationId !== null,
    fetch: async ({
      signal,
    }): Promise<readonly IdentifiableMessageResponse[]> => {
      if (conversationId === null) return []
      const response = await api(AIConversationsApiFactory).getMessages(
        userId,
        conversationId,
        { signal }
      )
      return response.data
    },
    meta: { errorContext: "This chat could not be loaded" },
  })
}

export interface UsageWindow {
  readonly label: string
  readonly usedShare: number | null
  /** Epoch MILLISECONDS, or null when the server sent an unparseable stamp. */
  readonly resetAt: number | null
}

export interface UsageView {
  readonly windows: readonly UsageWindow[]
  readonly peakShare: number | null
}

export { aiUsageQueryOptions }

export function useConversations(userId: UserId) {
  return useQuery(conversationsQueryOptions(userId))
}

export function useConversationMessages(
  userId: UserId,
  conversationId: ConversationId | null
) {
  return useQuery(conversationMessagesQueryOptions(userId, conversationId))
}

export function useAiUsage(userId: UserId) {
  return useQuery({ ...aiUsageQueryOptions(userId), select: toUsageView })
}

export function groupConversations(
  conversations: readonly ConversationSummary[],
  now: number
): readonly ConversationGroup[] {
  const day = 24 * 60 * 60 * 1000
  const buckets: {
    label: string
    within: number
    items: ConversationSummary[]
  }[] = [
    { label: "Today", within: day, items: [] },
    { label: "This week", within: 7 * day, items: [] },
    { label: "This month", within: 30 * day, items: [] },
    { label: "Earlier", within: Number.POSITIVE_INFINITY, items: [] },
  ]

  for (const conversation of [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  )) {
    const age = now - conversation.updatedAt
    const bucket = buckets.find((candidate) => age < candidate.within)
    bucket?.items.push(conversation)
  }

  return buckets.filter((bucket) => bucket.items.length > 0)
}

function toConversationSummary(
  raw: IdentifiableConversationResponse
): ConversationSummary {
  const title = raw.title?.trim()
  return {
    id: raw.id,
    title: title === undefined || title === "" ? null : title,
    updatedAt: Date.parse(raw.updated_at),
  }
}

function toUsageView(view: AiUsageView): UsageView {
  const windows: UsageWindow[] = view.windows.map((window) => {
    const used = window.input.used + window.output.used
    const limit = window.input.limit + window.output.limit
    return {
      label: window.label.toLocaleLowerCase(),
      usedShare: limit > 0 ? used / limit : null,
      resetAt: window.resetAt,
    }
  })
  const shares = windows
    .map((window) => window.usedShare)
    .filter((share): share is number => share !== null)
  return {
    windows,
    peakShare: shares.length === 0 ? null : Math.max(...shares),
  }
}
