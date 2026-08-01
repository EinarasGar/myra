import type * as React from "react"

import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { FOCUS_RING_INSET } from "./focus-ring"

export type SegmentedOption<T extends string> = {
  value: T
  label: React.ReactNode
  count?: number
  /** The set behind `count` is only partly read, so the number is a floor. */
  countIsLowerBound?: boolean
  ariaLabel?: string
  tone?: "default" | "attention"
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  size = "default",
  radius = "sm",
  stretch = false,
  className,
}: {
  value: T
  onValueChange: (next: T) => void
  options: readonly SegmentedOption<T>[]
  label: string
  size?: "default" | "sm"
  radius?: "sm" | "button"
  stretch?: boolean
  className?: string
}) {
  return (
    <ToggleGroup
      data-slot="segmented-control"
      aria-label={label}
      value={[value]}
      spacing={0}
      onValueChange={(next) => {
        const [chosen] = next
        if (chosen !== undefined && chosen !== value) onValueChange(chosen as T)
      }}
      className={cn(
        "items-stretch overflow-hidden border border-border",
        radius === "button" ? "rounded-button" : "rounded-sm",
        stretch && "w-full",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        const attention = option.tone === "attention"

        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            {...(option.ariaLabel === undefined
              ? {}
              : { "aria-label": option.ariaLabel })}
            className={cn(
              "h-auto min-w-0 gap-[6px] rounded-none border-e border-border px-[11px] text-[11.5px] leading-none transition-colors duration-instant ease-out-quick last:border-e-0",
              size === "sm" ? "py-[5px]" : "py-[6px]",
              stretch && "flex-1",
              FOCUS_RING_INSET,
              attention
                ? "aria-pressed:bg-attention-dim"
                : "aria-pressed:bg-surface-2",
              selected && attention && "font-semibold text-attention",
              selected && !attention && "font-semibold text-ink",
              !selected && "font-medium text-ink-3",
              selected && attention
                ? "hover:bg-attention-dim hover:text-attention"
                : "hover:bg-surface-2",
              selected && !attention && "hover:text-ink",
              !selected && "hover:text-ink-2"
            )}
          >
            {option.label}
            {option.count === undefined ? null : (
              <span
                data-figure=""
                className="rounded-full border border-current px-[5px] py-px font-mono text-[9.5px] leading-[1.4] font-semibold tabular-nums"
              >
                {option.count}
                {option.countIsLowerBound === true ? "+" : null}
              </span>
            )}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
