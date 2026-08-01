import type * as React from "react"

import { cn } from "@/lib/utils"

import { Truncate } from "./truncate"

/**
 * `overflow-clip` rather than `overflow-hidden`: hidden makes the panel a scroll container, so a
 * sticky table header inside it resolves against a box that never scrolls and never sticks.
 */
export function Panel({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cn(
        "overflow-clip rounded-panel border border-border bg-surface",
        className
      )}
      {...props}
    />
  )
}

export function PanelHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "flex items-center gap-[10px] border-b border-border px-[18px] py-[14px]",
        className
      )}
      {...props}
    />
  )
}

export function PanelTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="panel-title"
      className={cn(
        "me-auto min-w-0 text-[14px] leading-none font-bold tracking-[-0.01em]",
        className
      )}
      {...props}
    >
      <Truncate className="block">{children}</Truncate>
    </h2>
  )
}

export function PanelNote({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="panel-note"
      className={cn(
        "flex-none text-[11px] leading-none whitespace-nowrap text-ink-3",
        className
      )}
      {...props}
    />
  )
}

export function PanelBody({
  dense = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { dense?: boolean }) {
  return (
    <div
      data-slot="panel-body"
      className={cn(dense ? "p-[15px]" : "p-[18px]", className)}
      {...props}
    />
  )
}

export function PanelFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-footer"
      className={cn(
        "flex items-center gap-[10px] border-t border-border bg-surface-2 px-[18px] py-[12px] text-[11.5px] leading-none font-semibold text-brand",
        className
      )}
      {...props}
    />
  )
}

export function PanelFootnote({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-footnote"
      className={cn(
        "border-t border-border bg-surface-2 px-[18px] py-[11px] text-[11px] leading-[1.5] text-pretty text-ink-3",
        className
      )}
      {...props}
    />
  )
}

export function Footnote({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="footnote"
      className={cn(
        "mt-3 text-[11px] leading-[1.5] text-pretty text-ink-3",
        className
      )}
      {...props}
    />
  )
}
