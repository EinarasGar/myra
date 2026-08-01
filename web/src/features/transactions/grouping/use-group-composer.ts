import { useCallback, useState } from "react"

import type { LedgerGroupRow, LedgerTransactionRow } from "../api"

export type GroupComposerTarget =
  | { readonly kind: "create"; readonly seed: readonly LedgerTransactionRow[] }
  | {
      readonly kind: "add"
      readonly group: LedgerGroupRow
      readonly seed: readonly LedgerTransactionRow[]
    }

export interface GroupComposerController {
  readonly target: GroupComposerTarget | null
  readonly isOpen: boolean
  /** Changes on every open, so the sheet remounts and no draft outlives the rows it named. */
  readonly instanceKey: string
  readonly openCreate: (seed?: readonly LedgerTransactionRow[]) => void
  readonly openAdd: (
    group: LedgerGroupRow,
    seed?: readonly LedgerTransactionRow[]
  ) => void
  readonly setOpen: (open: boolean) => void
  readonly close: () => void
}

export function useGroupComposer(): GroupComposerController {
  const [target, setTarget] = useState<GroupComposerTarget | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [opens, setOpens] = useState(0)

  const open = useCallback((next: GroupComposerTarget) => {
    setOpens((count) => count + 1)
    setTarget(next)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    target,
    isOpen,
    instanceKey: `group-composer-${String(opens)}`,
    openCreate: (seed = []) => {
      open({ kind: "create", seed })
    },
    openAdd: (group, seed = []) => {
      open({ kind: "add", group, seed })
    },
    setOpen: setIsOpen,
    close,
  }
}
