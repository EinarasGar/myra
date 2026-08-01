import { toast } from "@/components/ui/toast"

import {
  CREATE_UNDONE_BODY,
  CREATE_UNDONE_TITLE,
  CREATED_TITLE,
  DEACTIVATED_TITLE,
  UNDO,
  UPDATE_UNDONE_BODY,
  UPDATE_UNDONE_TITLE,
  UPDATED_TITLE,
} from "./copy"

const TIMEOUT_MS = 6000

export function accountCreatedToast(input: {
  name: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: TIMEOUT_MS,
    title: CREATED_TITLE,
    description: `${input.name} is on your accounts list.`,
    actionProps: { children: UNDO, onClick: input.onUndo },
  })
}

export function accountCreateUndoneToast(): void {
  toast.add({
    type: "info",
    timeout: TIMEOUT_MS,
    title: CREATE_UNDONE_TITLE,
    description: CREATE_UNDONE_BODY,
  })
}

export function accountUpdatedToast(input: {
  name: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: TIMEOUT_MS,
    title: UPDATED_TITLE,
    description: `${input.name} is up to date.`,
    actionProps: { children: UNDO, onClick: input.onUndo },
  })
}

export function accountUpdateUndoneToast(): void {
  toast.add({
    type: "info",
    timeout: TIMEOUT_MS,
    title: UPDATE_UNDONE_TITLE,
    description: UPDATE_UNDONE_BODY,
  })
}

export function accountDeactivatedToast(name: string): void {
  toast.add({
    type: "success",
    timeout: TIMEOUT_MS,
    title: DEACTIVATED_TITLE,
    description: `${name} is off your list. Its transactions stay in the ledger.`,
  })
}
