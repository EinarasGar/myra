import type * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { focusRing } from "./focus-ring"

export function GhostRowMarker({
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children">) {
  return (
    <span
      data-slot="ghost-marker"
      aria-hidden
      className={cn(
        "block text-center font-mono text-[12px] leading-none font-medium text-ghost",
        className
      )}
      {...props}
    >
      ◌
    </span>
  )
}

export function DisclosureCaret({
  expanded = false,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { expanded?: boolean }) {
  return (
    <span
      data-slot="disclosure-caret"
      aria-hidden
      data-expanded={expanded || undefined}
      className={cn(
        "block text-center text-[10px] leading-none font-medium text-ink-2 transition-transform duration-quick ease-out-quick",
        !expanded && "-rotate-90",
        className
      )}
      {...props}
    >
      ▾
    </span>
  )
}

export function ChildSeam({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="child-seam"
      aria-hidden
      className={cn(
        "block h-full w-px justify-self-center bg-border-strong",
        className
      )}
      {...props}
    />
  )
}

export function InlineRowAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="inline-row-action"
      variant="outline"
      className={cn(
        "h-auto justify-self-start rounded-sm border-border-strong bg-surface px-2 py-[5px] text-[10.5px] leading-none font-semibold text-ink",
        focusRing.sm,
        className
      )}
      {...props}
    />
  )
}
