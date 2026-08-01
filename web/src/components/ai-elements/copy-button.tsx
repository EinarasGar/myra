import { Check, Copy, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { useCopyToClipboard } from "./use-copy-to-clipboard"

export interface CopyButtonProps {
  value: string | (() => string)
  label?: string
  copiedLabel?: string
  failedLabel?: string
  withText?: boolean
  className?: string
}

const ICONS = {
  idle: Copy,
  copied: Check,
  failed: X,
} as const

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Copy failed",
  withText = false,
  className,
}: CopyButtonProps) {
  const { state, copy } = useCopyToClipboard()
  const Icon = ICONS[state]
  const text =
    state === "copied" ? copiedLabel : state === "failed" ? failedLabel : label

  return (
    <Button
      type="button"
      variant="ghost"
      size={withText ? "xs" : "icon-xs"}
      aria-label={text}
      data-state={state}
      onClick={() => {
        void copy(typeof value === "function" ? value() : value)
      }}
      className={cn(
        "text-ink-3 data-[state=copied]:text-positive data-[state=failed]:text-negative",
        className
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={1.8}
        data-icon={withText ? "inline-start" : undefined}
      />
      {withText ? (
        <span className="text-[11px] leading-none font-semibold">{text}</span>
      ) : null}
    </Button>
  )
}
