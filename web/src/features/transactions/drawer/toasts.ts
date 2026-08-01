import { countOf } from "@/lib/format"
import { toast } from "@/components/ui/toast"

const REVERSIBLE_TIMEOUT_MS = 6000

export function markedReviewedToast(input: {
  description: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Marked reviewed",
    description: `“${input.description}” is no longer waiting on you.`,
    actionProps: { children: "Undo", onClick: input.onUndo },
  })
}

export function restoredToast(description: string): void {
  toast.add({
    type: "info",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Back in the queue",
    description: `“${description}” is unreviewed again.`,
  })
}

export function groupDeletedToast(input: {
  description: string
  count: number
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Group deleted",
    description: `“${input.description}” and the ${countOf(input.count, "transaction")} inside it are gone. Deleting a group cannot be undone.`,
  })
}

export function deletedToast(description: string): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Deleted",
    description: `“${description}” and its entries are gone. Deleting a transaction cannot be undone.`,
  })
}
