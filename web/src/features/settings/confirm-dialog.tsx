import type { ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/**
 * A confirmation is not an error: the surface stays neutral, only the confirm button
 * carries the negative tone, and it is outlined rather than filled.
 */
export function ConfirmDestructive({
  open,
  onOpenChange,
  title,
  lost,
  survives,
  confirmLabel,
  pending = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  lost: ReactNode
  survives?: ReactNode
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-sheet border border-border-strong bg-surface sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[14px] leading-[1.3] font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[12px] leading-[1.6] text-pretty text-ink-2">
            {lost}
          </AlertDialogDescription>
          {survives ? (
            <p className="text-[12px] leading-[1.6] text-pretty text-ink-3 sm:text-left">
              {survives}
            </p>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
