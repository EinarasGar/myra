"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { focusRing } from "./focus-ring"

const CLAMP = {
  1: "truncate",
  2: "line-clamp-2",
  3: "line-clamp-3",
} as const

export type TruncateLines = keyof typeof CLAMP

const INTERACTIVE_ANCESTOR = [
  "a[href]",
  "button",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[tabindex="0"]',
].join(",")

const sizeListeners = new Map<Element, () => void>()
let sizeObserver: ResizeObserver | null = null

function observeSize(element: Element, onResize: () => void) {
  sizeObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) sizeListeners.get(entry.target)?.()
  })
  sizeListeners.set(element, onResize)
  sizeObserver.observe(element)
  return () => {
    sizeListeners.delete(element)
    sizeObserver?.unobserve(element)
  }
}

function isClipped(element: HTMLElement, lines: TruncateLines) {
  return lines === 1
    ? element.scrollWidth - element.clientWidth > 1
    : element.scrollHeight - element.clientHeight > 1
}

export type TruncateProps = Omit<React.ComponentProps<"span">, "children"> & {
  text?: string
  children?: React.ReactNode
  lines?: TruncateLines
  side?: React.ComponentProps<typeof TooltipContent>["side"]
}

export function Truncate({
  text,
  children,
  lines = 1,
  side = "top",
  className,
  onClick,
  ...props
}: TruncateProps) {
  const [node, setNode] = React.useState<HTMLSpanElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [full, setFull] = React.useState(text ?? "")

  const subscribe = React.useCallback(
    (onStoreChange: () => void) =>
      node === null ? () => undefined : observeSize(node, onStoreChange),
    [node]
  )
  const clipped = React.useSyncExternalStore(subscribe, () =>
    node === null ? false : isClipped(node, lines)
  )

  const host = node?.parentElement?.closest(INTERACTIVE_ANCESTOR) ?? null
  const body = children ?? text
  const shell = cn(CLAMP[lines], className)

  if (!clipped) {
    return (
      <span
        ref={setNode}
        data-slot="truncate"
        className={shell}
        onClick={onClick}
        {...props}
      >
        {body}
      </span>
    )
  }

  const reveal = (next: boolean) => {
    if (next && node !== null) setFull(text ?? node.textContent ?? "")
    setOpen(next)
  }

  return (
    <Tooltip open={open} onOpenChange={reveal}>
      <TooltipTrigger
        render={
          <span
            ref={setNode}
            data-slot="truncate"
            data-clipped="true"
            tabIndex={host === null ? 0 : undefined}
            className={cn(shell, host === null && focusRing.sm)}
            {...props}
            onClick={(event: React.MouseEvent<HTMLSpanElement>) => {
              onClick?.(event)
              if (
                host === null &&
                window.matchMedia("(pointer: coarse)").matches
              ) {
                reveal(true)
              }
            }}
          >
            {body}
          </span>
        }
      />
      <TooltipContent side={side}>{full}</TooltipContent>
    </Tooltip>
  )
}
