import { toast } from "@/components/ui/toast"

const REVERSIBLE_TIMEOUT_MS = 8000

export function groupUpdatedToast(input: {
  description: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Group saved",
    description: `“${input.description}” is what the ledger row now reads. The transactions inside it are unchanged.`,
    actionProps: { children: "Undo", onClick: input.onUndo },
  })
}

export function groupUpdateUndoneToast(description: string): void {
  toast.add({
    type: "info",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Back to what it was",
    description: `The group reads “${description}” again.`,
  })
}

export function groupUpdateUndoFailedToast(message: string): void {
  toast.add({
    type: "error",
    title: "Undo did not finish",
    description: `${message} The ledger below is reloaded, so what it shows is what actually happened.`,
  })
}
