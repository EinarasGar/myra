import type { ComponentProps } from "react"
import { ArrowDown } from "lucide-react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function Conversation({
  className,
  ...props
}: ComponentProps<typeof StickToBottom>) {
  return (
    <StickToBottom
      data-slot="conversation"
      role="log"
      initial="instant"
      resize="smooth"
      className={cn("relative flex min-h-0 flex-col", className)}
      {...props}
    />
  )
}

export function ConversationContent({
  className,
  ...props
}: ComponentProps<typeof StickToBottom.Content>) {
  return (
    <StickToBottom.Content
      data-slot="conversation-content"
      className={cn("flex min-w-0 flex-col gap-5 py-5", className)}
      {...props}
    />
  )
}

export function ConversationScrollButton({
  label = "Jump to latest",
}: {
  label?: string
}) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()
  if (isAtBottom) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        void scrollToBottom()
      }}
      className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-surface px-[11px] text-[11.5px] font-medium text-ink-2 shadow-popover"
    >
      <ArrowDown data-icon="inline-start" aria-hidden strokeWidth={1.9} />
      {label}
    </Button>
  )
}
