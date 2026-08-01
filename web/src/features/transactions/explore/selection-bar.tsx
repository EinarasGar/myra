import { useState } from "react"

import { Figure } from "@/components/figure"
import { focusRing, HIT_TARGET } from "@/components/primitives"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { GroupingAction } from "../grouping"

import type { SelectionActions, SelectionTargets } from "./selection"

const NOTE_ID = "selection-refusal-note"

export function SelectionBar({
  targets,
  actions,
  grouping,
  isPending,
  onMarkReviewed,
  onHide,
  onGroup,
  onDelete,
  onClear,
}: {
  targets: SelectionTargets
  actions: SelectionActions
  grouping: GroupingAction
  isPending: boolean
  onMarkReviewed: () => void
  onHide: () => void
  onGroup: () => void
  onDelete: () => void
  onClear: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  if (targets.count === 0) return null

  const note =
    actions.hide.note ??
    actions.review.note ??
    (grouping.kind === "none" ? grouping.reason : null)
  const describes =
    actions.hide.note !== null
      ? "hide"
      : actions.review.note !== null
        ? "review"
        : "group"

  return (
    <div
      data-slot="selection-bar"
      className="pointer-events-none fixed inset-x-0 bottom-[82px] z-30 flex justify-center px-4 md:bottom-[26px] lg:left-[58px]"
    >
      <div
        role="region"
        aria-label="Bulk actions"
        className="pointer-events-auto flex max-w-full flex-col gap-[6px] rounded-panel border border-border-strong bg-surface-2 py-[9px] pr-[10px] pl-[15px] shadow-[0_12px_32px_var(--color-scrim)]"
      >
        <div className="flex flex-wrap items-center gap-[6px]">
          <Figure
            value={targets.count}
            kind="plain"
            size="base"
            className="text-[12px] font-semibold"
          />
          <span className="text-[12px] leading-none text-ink-2">selected</span>
          <span
            aria-hidden
            className="mx-1 h-5 w-px flex-none bg-border-strong"
          />

          <Button
            variant="ghost"
            disabled={isPending || actions.review.isBlocked}
            onClick={onMarkReviewed}
            {...(note !== null && describes === "review"
              ? { "aria-describedby": NOTE_ID }
              : {})}
            className="h-auto px-[11px] py-[7px] text-[11.5px] leading-none text-ink"
          >
            {actions.review.label}
          </Button>
          <Button
            variant="ghost"
            disabled={isPending || actions.hide.isBlocked}
            onClick={onHide}
            {...(note !== null && describes === "hide"
              ? { "aria-describedby": NOTE_ID }
              : {})}
            className="h-auto px-[11px] py-[7px] text-[11.5px] leading-none text-ink"
          >
            {actions.hide.label}
          </Button>
          <Button
            variant="ghost"
            data-slot="selection-group"
            disabled={isPending || grouping.kind === "none"}
            onClick={onGroup}
            {...(note !== null && describes === "group"
              ? { "aria-describedby": NOTE_ID }
              : {})}
            className="h-auto px-[11px] py-[7px] text-[11.5px] leading-none text-ink"
          >
            {grouping.kind === "none" ? "Group" : grouping.label}
          </Button>

          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  disabled={isPending}
                  className="h-auto px-[11px] py-[7px] text-[11.5px] leading-none text-negative hover:text-negative"
                >
                  Delete
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete{" "}
                  <Figure value={targets.count} kind="plain" size="base" />{" "}
                  {targets.count === 1 ? "row" : "rows"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This removes them from the ledger and from every balance they
                  feed. It cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep them</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setConfirming(false)
                    onDelete()
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button
            type="button"
            aria-label="Clear selection"
            onClick={onClear}
            className={cn(
              "px-[9px] py-[7px] text-[13px] leading-none text-ink-3 outline-none",
              HIT_TARGET,
              focusRing.sm
            )}
          >
            ✕
          </button>
        </div>

        {note === null ? null : (
          <p
            id={NOTE_ID}
            data-slot="selection-note"
            className="max-w-[52ch] px-[1px] text-[11px] leading-[1.5] text-pretty text-ink-3"
          >
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
