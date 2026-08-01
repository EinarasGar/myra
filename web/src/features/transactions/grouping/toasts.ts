import { countOf } from "@/lib/format"
import { toast } from "@/components/ui/toast"

const REVERSIBLE_TIMEOUT_MS = 8000

function rows(count: number): string {
  return countOf(count, "transaction")
}

export function groupedToast(input: {
  count: number
  description: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Grouped",
    description: `${rows(input.count)} now sit under “${input.description}” as one row.`,
    actionProps: { children: "Undo", onClick: input.onUndo },
  })
}

export function ungroupedToast(count: number): void {
  toast.add({
    type: "info",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Back to separate rows",
    description: `${rows(count)} are on their own in the ledger again.`,
  })
}

export function addedToGroupToast(input: {
  count: number
  description: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Added to group",
    description: `${rows(input.count)} moved under “${input.description}”.`,
    actionProps: { children: "Undo", onClick: input.onUndo },
  })
}

export function removedFromGroupToast(input: {
  description: string
  groupDescription: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Removed from group",
    description: `“${input.description}” is a row of its own again, out of “${input.groupDescription}”.`,
    actionProps: { children: "Undo", onClick: input.onUndo },
  })
}

export function returnedToGroupToast(description: string): void {
  toast.add({
    type: "info",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Back in the group",
    description: `“${description}” is under its group again.`,
  })
}

export function undoFailedToast(message: string): void {
  toast.add({
    type: "error",
    title: "Undo did not finish",
    description: `${message} The ledger below is reloaded, so what it shows is what actually happened.`,
  })
}
