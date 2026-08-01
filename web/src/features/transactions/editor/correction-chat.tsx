import { Sparkles } from "lucide-react"

import { mockAttributes } from "@/lib/mock"
import { cn } from "@/lib/utils"

import { correctionCount, CORRECTIONS_TITLE } from "./copy"
import type { EditorProposal } from "./proposal"

export function CorrectionChat({
  proposal,
  correctedCount,
}: {
  proposal: EditorProposal
  correctedCount: number
}) {
  return (
    <section
      data-slot="correction-chat"
      {...mockAttributes(proposal.mockId)}
      className="overflow-hidden rounded-md border border-border"
    >
      <div className="flex items-center gap-[9px] border-b border-border bg-surface-2 px-[13px] py-[10px]">
        <h3 className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
          {CORRECTIONS_TITLE}
        </h3>
        <span className="flex-1" />
        <span className="font-mono text-[10px] leading-none font-medium text-ink-3">
          {correctionCount(correctedCount)}
        </span>
      </div>

      <div className="flex flex-col gap-[11px] px-[13px] pt-[13px] pb-[11px]">
        {proposal.transcript.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.key} className="flex justify-end">
                <p className="max-w-[76%] rounded-[9px_9px_3px_9px] border border-border bg-surface-2 px-3 py-[9px] text-[12px] leading-[1.5] text-pretty text-ink">
                  {message.text}
                </p>
              </div>
            )
          }
          if (message.role === "system") {
            return (
              <div
                key={message.key}
                className="flex items-center gap-2 pl-[22px]"
              >
                <span className="rounded-chip bg-attention-dim px-[6px] py-1 text-[9.5px] leading-none font-semibold tracking-[0.06em] text-attention uppercase">
                  {message.text}
                </span>
              </div>
            )
          }
          return (
            <div key={message.key} className="flex items-start gap-[9px]">
              <Sparkles
                aria-hidden
                className="mt-[3px] size-[13px] flex-none text-brand"
                strokeWidth={1.8}
              />
              <p className="text-[12px] leading-[1.5] text-pretty text-ink-2">
                {message.text}
              </p>
            </div>
          )
        })}

        <p
          data-slot="composer-refusal"
          className={cn(
            "mt-[2px] rounded-button border border-dashed border-border-strong px-3 py-[9px]",
            "text-[11px] leading-[1.5] text-pretty text-ink-3"
          )}
        >
          {proposal.composerRefusal}
        </p>
      </div>
    </section>
  )
}
