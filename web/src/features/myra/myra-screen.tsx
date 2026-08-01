import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useUserId } from "@/auth"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements"
import { useShellWidth } from "@/components/layout/breakpoints"
import { PageHeader } from "@/components/primitives"

import {
  togglePin,
  useAiUsage,
  useConversations,
  useMyraChat,
  type AnswerCard,
} from "./api"
import { ChatEmptyState, QuotaChip } from "./components/chat-header"
import { RateLimitBanner } from "./components/banners"
import { Composer } from "./components/composer"
import { ConversationList } from "./components/conversation-list"
import { PinnedStrip } from "./components/pinned-strip"
import { TurnView } from "./components/turn-view"
import {
  CONTEXT_SUFFIX,
  HISTORY_ERROR,
  JUMP_TO_LATEST,
  MYRA_EYEBROW,
  MYRA_SUBTITLE,
  MYRA_TITLE,
  TRANSCRIPT_LABEL,
} from "./copy"

export interface MyraScreenProps {
  ask?: string | undefined
  contextPage?: string | undefined
  onAskConsumed?: () => void
}

export function MyraScreen({
  ask,
  contextPage,
  onAskConsumed,
}: MyraScreenProps) {
  const userId = useUserId()
  const width = useShellWidth()
  const chat = useMyraChat(userId)
  const conversations = useConversations(userId)
  const usage = useAiUsage(userId)

  const [draft, setDraft] = useState("")
  const [pins, setPins] = useState<readonly AnswerCard[]>([])
  const [mountedAt] = useState(() => Date.now())
  const askedRef = useRef<string | null>(null)

  const send = chat.send

  useEffect(() => {
    if (ask === undefined || ask.trim() === "") {
      askedRef.current = null
      return
    }
    if (askedRef.current === ask) return
    askedRef.current = ask
    const page = contextPage?.trim()
    const message =
      page === undefined || page === ""
        ? ask
        : `${ask}\n\n${CONTEXT_SUFFIX(page)}`
    send(message, page === undefined || page === "" ? null : page)
    onAskConsumed?.()
  }, [ask, contextPage, onAskConsumed, send])

  const pinCard = useCallback((card: AnswerCard) => {
    setPins((previous) => togglePin(previous, card))
  }, [])

  const unpin = useCallback((id: string) => {
    setPins((previous) => previous.filter((pin) => pin.id !== id))
  }, [])

  const refine = useCallback(
    (prompt: string) => {
      send(prompt)
    },
    [send]
  )

  const pinnedIds = useMemo(() => pins.map((pin) => pin.id), [pins])

  const showSidebar = width === "full" || width === "tight"
  const isEmpty = chat.turns.length === 0 && !chat.isLoadingHistory

  const conversationPane = (
    <ConversationList
      conversations={conversations.data ?? []}
      failed={conversations.isError}
      activeId={chat.conversationId}
      now={mountedAt}
      onNewChat={chat.startNewChat}
      onOpen={chat.openConversation}
    />
  )

  return (
    <div data-slot="myra-screen" className="pt-3">
      <PageHeader
        eyebrow={MYRA_EYEBROW}
        title={MYRA_TITLE}
        intro={MYRA_SUBTITLE}
        actions={<QuotaChip usage={usage.data} />}
      />

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[248px_1fr]">
        {showSidebar ? (
          <div className="min-w-0 lg:sticky lg:top-6">{conversationPane}</div>
        ) : null}

        <div className="flex min-w-0 flex-col">
          <PinnedStrip pins={pins} onUnpin={unpin} />

          {chat.historyFailed ? (
            <p
              role="alert"
              className="py-4 text-[12px] leading-[1.6] text-ink-2"
            >
              {HISTORY_ERROR}
            </p>
          ) : null}

          {isEmpty ? (
            <ChatEmptyState
              onSuggestion={(prompt) => {
                setDraft(prompt)
              }}
            />
          ) : (
            <Conversation className="max-h-[calc(100svh_-_270px)] min-h-[180px] lg:max-h-[calc(100svh_-_310px)]">
              <ConversationContent
                aria-label={TRANSCRIPT_LABEL}
                aria-live="polite"
              >
                {chat.turns.map((turn, index) => (
                  <TurnView
                    key={turn.id}
                    turn={turn}
                    userId={userId}
                    streaming={
                      chat.isStreaming && index === chat.turns.length - 1
                    }
                    busy={chat.isStreaming}
                    pinnedIds={pinnedIds}
                    onPin={pinCard}
                    onRefine={refine}
                    onRespond={chat.respond}
                    onRetry={chat.retry}
                  />
                ))}
              </ConversationContent>
              <ConversationScrollButton label={JUMP_TO_LATEST} />
            </Conversation>
          )}

          <div className="sticky bottom-0 -mx-1 bg-background px-1 pt-3 pb-4">
            {chat.rateLimit === null ? null : (
              <RateLimitBanner
                error={chat.rateLimit}
                onDismiss={chat.dismissRateLimit}
              />
            )}
            <Composer
              userId={userId}
              streaming={chat.isStreaming}
              draft={draft}
              onDraftChange={setDraft}
              onSend={(message, attachments) => {
                chat.send(message, null, attachments)
              }}
              onStop={chat.stop}
            />
          </div>

          {showSidebar ? null : (
            <div className="mt-6 border-t border-border pt-5">
              {conversationPane}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
