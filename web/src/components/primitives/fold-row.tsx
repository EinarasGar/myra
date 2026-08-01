import type * as React from "react"

import { cn } from "@/lib/utils"
import { TableCell, TableRow } from "@/components/ui/table"

import { focusRing } from "./focus-ring"
import { HIT_TARGET_ROW } from "./hit-target"
import { Truncate } from "./truncate"

export type FoldMode = "show-all" | "remainder"

function derivedLabel(total: number, shown: number, mode: FoldMode) {
  return mode === "remainder" ? `+${total - shown} more` : `Show all ${total} →`
}

type FoldCounts = {
  total: number
  shown: number
  mode?: FoldMode
  onShowAll?: () => void
}

export function TableFoldRow({
  total,
  shown,
  mode = "show-all",
  onShowAll,
  span,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"tr">, "children"> &
  FoldCounts & { span: number; label?: React.ReactNode }) {
  if (shown >= total) return null

  return (
    <TableRow
      data-slot="table-fold-row"
      className={cn("block border-b border-border", className)}
      {...props}
    >
      <TableCell
        aria-colspan={span}
        className="flex h-[38px] items-center gap-[10px] px-[var(--dt-pad)] py-0"
      >
        <span aria-hidden className="w-6 flex-none" />
        <button
          type="button"
          onClick={onShowAll}
          className={cn(
            "text-[11.5px] leading-none font-medium text-brand outline-none",
            HIT_TARGET_ROW,
            focusRing.chip
          )}
        >
          {label ?? derivedLabel(total, shown, mode)}
        </button>
      </TableCell>
    </TableRow>
  )
}

export function FoldRow({
  total,
  shown,
  mode = "show-all",
  onShowAll,
  variant = "dashed",
  label,
  names,
  actionLabel = "Show",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  FoldCounts & {
    variant?: "dashed" | "panel"
    label?: React.ReactNode
    names?: React.ReactNode
    actionLabel?: string
  }) {
  if (shown >= total) return null

  return (
    <div
      data-slot="fold-row"
      className={cn(
        "flex items-center gap-[11px] rounded-panel",
        variant === "dashed"
          ? "border border-dashed border-border-strong px-[18px] py-[13px]"
          : "border border-border bg-surface px-4 py-[13px]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "flex-none text-[11.5px] leading-none font-semibold whitespace-nowrap",
          variant === "dashed" ? "text-ink-2" : "text-brand"
        )}
      >
        {label ?? derivedLabel(total, shown, mode)}
      </span>
      {names ? (
        <Truncate className="min-w-0 flex-1 text-[11px] leading-[1.5] text-ink-3">
          {names}
        </Truncate>
      ) : (
        <span className="flex-1" />
      )}
      <button
        type="button"
        onClick={onShowAll}
        className={cn(
          "flex-none text-[11.5px] leading-none font-semibold whitespace-nowrap text-brand outline-none",
          HIT_TARGET_ROW,
          focusRing.chip
        )}
      >
        {actionLabel}
      </button>
    </div>
  )
}
