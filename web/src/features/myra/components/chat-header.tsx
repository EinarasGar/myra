import { Sparkle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"
import { focusRing } from "@/components/primitives"

import type { UsageView } from "../api"
import {
  EMPTY_BODY,
  EMPTY_HEADLINE,
  QUOTA_NOTE,
  QUOTA_UNAVAILABLE,
  SUGGESTIONS,
} from "../copy"

export function QuotaChip({ usage }: { usage: UsageView | undefined }) {
  const peak = usage?.peakShare ?? null
  const tone =
    peak === null
      ? "bg-ghost"
      : peak >= 0.9
        ? "bg-negative"
        : peak >= 0.6
          ? "bg-attention"
          : "bg-positive"

  return (
    <span
      title={QUOTA_NOTE}
      className="inline-flex flex-none items-center gap-[7px] rounded-sm border border-border px-[10px] py-[6px]"
    >
      <span aria-hidden className={cn("size-[5px] rounded-full", tone)} />
      {usage === undefined ? (
        <span className="font-mono text-[10.5px] leading-none whitespace-nowrap text-ink-3">
          {QUOTA_UNAVAILABLE}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] leading-none whitespace-nowrap text-ink-3">
          {usage.windows.map((window) => (
            <span key={window.label} className="flex items-center gap-1">
              {window.label}
              <Figure
                value={window.usedShare}
                kind="percent"
                scale="ratio"
                decimals={0}
                size="micro"
                intent="meta"
              />
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

export function ChatEmptyState({
  onSuggestion,
}: {
  onSuggestion: (prompt: string) => void
}) {
  return (
    <div
      data-slot="myra-empty"
      className="flex min-h-[46svh] flex-1 flex-col items-center justify-center gap-[7px] py-5 pb-10 text-center"
    >
      <Sparkle
        className="mb-[10px] size-[26px] text-brand"
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="text-[17px] leading-[1.3] font-bold tracking-[-0.015em]">
        {EMPTY_HEADLINE}
      </h2>
      <p className="max-w-[400px] text-[12.5px] leading-[1.6] text-pretty text-ink-3">
        {EMPTY_BODY}
      </p>
      <div className="mt-[18px] flex max-w-[560px] flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              onSuggestion(suggestion)
            }}
            className={cn(
              "rounded-full border border-border-strong px-3 py-2 text-[12px] leading-none font-medium text-ink-2 transition-colors duration-instant ease-out-quick hover:bg-surface-2",
              focusRing.pill
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
