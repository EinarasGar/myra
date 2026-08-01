import type * as React from "react"

import { cn } from "@/lib/utils"

import { StateActions, StateCard, type StateAction } from "./state-card"

const MESSAGE_STATES = {
  error: { glyph: "△", tone: "text-negative", live: "alert" },
  degraded: { glyph: "◷", tone: "text-attention", live: "status" },
  waiting: { glyph: "◷", tone: "text-attention", live: "status" },
  offline: { glyph: "◷", tone: "text-attention", live: "status" },
  confirm: { glyph: "✓", tone: "text-ink-2", live: "status" },
} as const

type MessageStateKind = keyof typeof MESSAGE_STATES

export type MessageStateProps = Omit<
  React.ComponentProps<"section">,
  "children" | "title"
> & {
  headline: React.ReactNode
  body?: React.ReactNode
  detail?: React.ReactNode
  actions?: readonly StateAction[]
  footnote?: React.ReactNode
}

function MessageState({
  kind,
  headline,
  body,
  detail,
  actions = [],
  footnote,
  className,
  ...props
}: MessageStateProps & { kind: MessageStateKind }) {
  const { glyph, tone, live } = MESSAGE_STATES[kind]

  return (
    <StateCard footnote={footnote} className={className} {...props}>
      <div
        role={live}
        data-state={kind}
        className="flex items-start gap-3 px-5 pt-[18px] pb-[19px]"
      >
        <span
          aria-hidden
          className={cn(
            "mt-px flex-none text-[14px] leading-none font-semibold",
            tone
          )}
        >
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-[1.3] font-semibold">{headline}</p>
          {body ? (
            <p className="mt-[7px] text-[12px] leading-[1.6] text-pretty text-ink-2">
              {body}
            </p>
          ) : null}
          {detail ? (
            <p className="mt-[10px] rounded-sm bg-surface-2 px-[11px] py-[9px] font-mono text-[11px] leading-[1.5] text-pretty text-ink-3">
              {detail}
            </p>
          ) : null}
          <StateActions actions={actions} />
        </div>
      </div>
    </StateCard>
  )
}

export function ErrorState(props: MessageStateProps) {
  return <MessageState kind="error" {...props} />
}

export function DegradedState(props: MessageStateProps) {
  return <MessageState kind="degraded" {...props} />
}

export function WaitingState(props: MessageStateProps) {
  return <MessageState kind="waiting" {...props} />
}

export function OfflineState(props: MessageStateProps) {
  return <MessageState kind="offline" {...props} />
}

export function ConfirmState(props: MessageStateProps) {
  return <MessageState kind="confirm" {...props} />
}
