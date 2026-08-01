import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing, Truncate } from "@/components/primitives"
import { Button } from "@/components/ui/button"

import { groupConversations, type ConversationSummary } from "../api"
import {
  CONVERSATIONS_EMPTY,
  CONVERSATIONS_ERROR,
  CONVERSATIONS_FOOT,
  NEW_CHAT,
  UNTITLED_CONVERSATION,
} from "../copy"

export function ConversationList({
  conversations,
  failed,
  activeId,
  now,
  onNewChat,
  onOpen,
}: {
  conversations: readonly ConversationSummary[]
  failed: boolean
  activeId: string | null
  now: number
  onNewChat: () => void
  onOpen: (conversationId: string) => void
}) {
  const groups = groupConversations(conversations, now)

  return (
    <nav
      data-slot="myra-conversations"
      aria-label="Chats"
      className="flex min-w-0 flex-col gap-3"
    >
      <Button size="lg" className="w-full justify-start" onClick={onNewChat}>
        <Plus data-icon="inline-start" aria-hidden />
        {NEW_CHAT}
      </Button>

      {failed ? (
        <p
          role="status"
          className="px-2.5 text-[11px] leading-[1.5] text-ink-3"
        >
          {CONVERSATIONS_ERROR}
        </p>
      ) : null}

      {!failed && conversations.length === 0 ? (
        <p className="px-2.5 text-[11px] leading-[1.5] text-ink-3">
          {CONVERSATIONS_EMPTY}
        </p>
      ) : null}

      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="px-2.5 pt-[12px] pb-[7px] text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
            {group.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  aria-current={
                    conversation.id === activeId ? "true" : undefined
                  }
                  onClick={() => {
                    onOpen(conversation.id)
                  }}
                  className={cn(
                    "block w-full rounded-sm px-2.5 py-[9px] text-left text-[12px] leading-[1.3] font-medium transition-colors duration-instant ease-out-quick",
                    conversation.id === activeId
                      ? "bg-surface-2 text-ink"
                      : "text-ink-2 hover:bg-surface-2",
                    focusRing.sm
                  )}
                >
                  <Truncate
                    text={conversation.title ?? UNTITLED_CONVERSATION}
                    className="block"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="mt-auto px-2.5 pt-3 text-[10.5px] leading-[1.5] text-pretty text-ink-3">
        {CONVERSATIONS_FOOT}
      </p>
    </nav>
  )
}
