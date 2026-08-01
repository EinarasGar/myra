import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import {
  META_CHIP_TONES,
  STATUS_WORDS,
  type MetaChipTone,
  type StatusWord,
} from "./status"

const chipVariants = cva(
  "inline-flex flex-none items-center rounded-chip border border-border-strong bg-transparent text-[9.5px] leading-none font-semibold tracking-[0.06em] whitespace-nowrap uppercase",
  {
    variants: {
      size: {
        default: "px-[6px] py-[4px]",
        row: "px-[5px] py-[3px]",
        binding: "px-[7px] py-[5px]",
      },
    },
    defaultVariants: { size: "default" },
  }
)

export function StatusChip({
  status,
  size,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof chipVariants> & { status: StatusWord }) {
  const word = STATUS_WORDS[status]
  return (
    <span
      data-slot="status-chip"
      data-status={status}
      className={cn(chipVariants({ size }), word.tone, className)}
      {...props}
    >
      {word.label}
    </span>
  )
}

export function MetaChip({
  tone = "ghost",
  size,
  className,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof chipVariants> & { tone?: MetaChipTone }) {
  return (
    <span
      data-slot="meta-chip"
      className={cn(chipVariants({ size }), META_CHIP_TONES[tone], className)}
      {...props}
    />
  )
}

export function CountChip({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="count-chip"
      className={cn(
        "inline-flex flex-none items-center rounded-chip border border-border-strong bg-surface px-[5px] py-[3px] font-mono text-[9.5px] leading-none font-semibold text-ink-2 tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export function SyncDot({
  status,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { status: StatusWord }) {
  const word = STATUS_WORDS[status]
  return (
    <span
      data-slot="sync-status"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-[6px] text-[11px] leading-[1.4]",
        word.tone,
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn("size-[6px] flex-none rounded-full", word.dot)}
      />
      {word.label}
    </span>
  )
}
