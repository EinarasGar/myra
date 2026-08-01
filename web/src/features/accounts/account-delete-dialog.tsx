import type { AccountId, UserId } from "@/lib/query"
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

import { accountDeactivatedToast } from "./account-toasts"
import { useDeleteAccount } from "./api"
import {
  DEACTIVATE_CONFIRM,
  DEACTIVATE_KEEP,
  DEACTIVATE_LOST,
  DEACTIVATE_SURVIVES,
  DEACTIVATE_TITLE_PREFIX,
} from "./copy"

export interface DeletableAccount {
  readonly accountId: AccountId
  readonly name: string
}

/**
 * Deactivation has no inverse in the API, so the consequence has to be read before the
 * click rather than offered as an Undo afterwards.
 */
export function AccountDeleteDialog({
  userId,
  account,
  open,
  onOpenChange,
  onDeleted,
}: {
  userId: UserId
  account: DeletableAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (accountId: AccountId) => void
}) {
  const remove = useDeleteAccount(userId)

  return (
    <AlertDialog
      open={open && account !== null}
      onOpenChange={(next) => {
        if (!remove.isPending) onOpenChange(next)
      }}
    >
      <AlertDialogContent className="rounded-sheet border border-border-strong bg-surface sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[14px] leading-[1.3] font-semibold">
            {DEACTIVATE_TITLE_PREFIX} {account?.name ?? "this account"}?
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="rounded-panel border border-negative-dim bg-surface px-[18px] pt-4 pb-[17px]">
          <AlertDialogDescription className="text-[11.5px] leading-[1.6] text-pretty text-ink-2 sm:text-left">
            {DEACTIVATE_LOST}
          </AlertDialogDescription>
          <p className="mt-[7px] text-[11.5px] leading-[1.6] text-pretty text-ink-3 sm:text-left">
            {DEACTIVATE_SURVIVES}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {DEACTIVATE_KEEP}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (account === null) return
              remove.mutate(
                { accountId: account.accountId },
                {
                  onSuccess: () => {
                    accountDeactivatedToast(account.name)
                    onDeleted?.(account.accountId)
                  },
                  onSettled: () => {
                    onOpenChange(false)
                  },
                }
              )
            }}
          >
            {remove.isPending ? "Deactivating…" : DEACTIVATE_CONFIRM}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
