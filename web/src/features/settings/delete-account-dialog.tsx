import { useNavigate } from "@tanstack/react-router"

import { useAuth, useUserId } from "@/auth"

import { useDeleteUser } from "./api/mutations"
import { ConfirmDestructive } from "./confirm-dialog"
import {
  ACCOUNT_DANGER_BODY,
  ACCOUNT_DANGER_SURVIVES,
  ACCOUNT_DANGER_TITLE,
  DELETE_ACCOUNT_CONFIRM,
} from "./copy"

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const userId = useUserId()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const remove = useDeleteUser(userId)

  return (
    <ConfirmDestructive
      open={open}
      onOpenChange={(next) => {
        if (!remove.isPending) onOpenChange(next)
      }}
      title={ACCOUNT_DANGER_TITLE}
      lost={ACCOUNT_DANGER_BODY}
      survives={ACCOUNT_DANGER_SURVIVES}
      confirmLabel={remove.isPending ? "Deleting…" : DELETE_ACCOUNT_CONFIRM}
      pending={remove.isPending}
      onConfirm={() => {
        remove.mutate(undefined, {
          onSuccess: () => {
            void signOut().then(() => navigate({ to: "/login" }))
          },
        })
      }}
    />
  )
}
