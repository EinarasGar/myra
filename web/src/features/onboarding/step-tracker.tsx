import { cn } from "@/lib/utils"

import type { TrackerStep } from "./steps"

const RING = {
  done: "border-brand bg-brand text-on-brand",
  now: "border-brand bg-brand-dim text-brand",
  todo: "border-border-strong text-ink-3",
} as const

const TITLE_TONE = {
  done: "text-ink",
  now: "text-ink",
  todo: "text-ink-3",
} as const

export function StepTracker({ steps }: { steps: readonly TrackerStep[] }) {
  return (
    <ol
      data-slot="step-tracker"
      aria-label="Setup steps"
      className="flex flex-col gap-[2px]"
    >
      {steps.map((step) => (
        <li
          key={step.id}
          data-state={step.state}
          {...(step.state === "now" ? { "aria-current": "step" } : {})}
          className="flex items-start gap-[14px] py-[13px]"
        >
          <span
            aria-hidden
            className={cn(
              "size-6 flex-none rounded-full border text-center font-mono text-[11px] leading-[22px] font-semibold",
              RING[step.state]
            )}
          >
            {step.ordinal}
          </span>
          <span className="min-w-0 pt-[3px]">
            <span
              className={cn(
                "block text-[13px] leading-[1.3] font-semibold",
                TITLE_TONE[step.state]
              )}
            >
              {step.title}
            </span>
            <span className="mt-[5px] block text-[11.5px] leading-[1.5] text-pretty text-ink-3">
              {step.body}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
