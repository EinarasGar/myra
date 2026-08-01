import { useCallback, useState } from "react"

import type { TransactionTypeTag } from "@/lib/domain/transaction-types"
import { isTransactionTypeTag } from "@/lib/domain/transaction-types"
import type { TransactionId } from "@/lib/query"

import type { EditorMode } from "./editor-panel"

export interface TransactionEditorController {
  readonly mode: EditorMode
  readonly isOpen: boolean
  /**
   * Changes on every open. Pass it as the sheet's `key`: a draft belongs to the thing it
   * was opened on, and remounting is the only way to be sure none of it leaks into the next.
   */
  readonly instanceKey: string
  readonly openCreate: (type?: TransactionTypeTag) => void
  readonly openEdit: (transactionId: TransactionId) => void
  readonly openProposal: () => void
  readonly setOpen: (open: boolean) => void
}

export function useTransactionEditor(): TransactionEditorController {
  const [mode, setMode] = useState<EditorMode>({ kind: "create" })
  const [isOpen, setIsOpen] = useState(false)
  const [opens, setOpens] = useState(0)

  const open = useCallback((next: EditorMode) => {
    setOpens((value) => value + 1)
    setMode(next)
    setIsOpen(true)
  }, [])

  return {
    mode,
    isOpen,
    instanceKey: `editor-${String(opens)}`,
    /**
     * The tag is re-checked because this is handed to onClick all over the app, where React
     * supplies a click event as the first argument and the type system cannot see it.
     */
    openCreate: (type) => {
      open(
        isTransactionTypeTag(type)
          ? { kind: "create", type }
          : { kind: "create" }
      )
    },
    openEdit: (transactionId) => {
      open({ kind: "edit", transactionId })
    },
    openProposal: () => {
      open({ kind: "proposal" })
    },
    setOpen: setIsOpen,
  }
}
