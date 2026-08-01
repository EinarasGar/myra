import { useCallback, useState } from "react"

import type { AccountId } from "@/lib/query"

import type { AccountEditorMode } from "./account-editor"

export interface AccountEditorController {
  readonly mode: AccountEditorMode
  readonly open: boolean
  readonly openCreate: () => void
  readonly openEdit: (accountId: AccountId) => void
  readonly setOpen: (open: boolean) => void
}

/**
 * The mode outlives the close so an Undo offered by the save toast still has the account
 * the mutation was bound to.
 */
export function useAccountEditor(): AccountEditorController {
  const [mode, setMode] = useState<AccountEditorMode>({ kind: "create" })
  const [open, setOpen] = useState(false)

  const openCreate = useCallback(() => {
    setMode({ kind: "create" })
    setOpen(true)
  }, [])

  const openEdit = useCallback((accountId: AccountId) => {
    setMode({ kind: "edit", accountId })
    setOpen(true)
  }, [])

  return { mode, open, openCreate, openEdit, setOpen }
}
