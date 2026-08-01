import { toast } from "@/components/ui/toast"

import {
  CREATE_UNDONE_BODY,
  CREATE_UNDONE_TITLE,
  CREATED_TITLE,
  UNDO,
  UPDATE_UNDO_UNAVAILABLE,
  UPDATED_TITLE,
} from "./copy"

const TIMEOUT_MS = 6000

export function createdToast(input: {
  typeName: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: TIMEOUT_MS,
    title: CREATED_TITLE,
    description: `${input.typeName} is in the ledger.`,
    actionProps: { children: UNDO, onClick: input.onUndo },
  })
}

export function undoneCreateToast(): void {
  toast.add({
    type: "info",
    timeout: TIMEOUT_MS,
    title: CREATE_UNDONE_TITLE,
    description: CREATE_UNDONE_BODY,
  })
}

export function updatedToast(): void {
  toast.add({
    type: "success",
    timeout: TIMEOUT_MS,
    title: UPDATED_TITLE,
    description: UPDATE_UNDO_UNAVAILABLE,
  })
}
