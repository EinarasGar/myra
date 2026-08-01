import { useState } from "react"

import type { TransactionId, UserId } from "@/lib/query"
import { cn } from "@/lib/utils"
import { AdaptiveSheet } from "@/components/layout/adaptive-sheet"

import type { EditorMode, TransactionEditorController } from "../editor"
import {
  EDITOR_SHEET_CLASS,
  useEditorPanel,
  useGroupEditorPanel,
} from "../editor"

import type { LedgerGroupRow, LedgerTransactionRow } from "../api"
import type { DrawerCursorProps } from "./drawer-panel"
import { DRAWER_SHEET_CLASS, useDrawerPanel } from "./drawer-panel"
import { useGroupDrawerPanel } from "./group-panel"

export interface TransactionPanelGroupProps {
  readonly label?: string | null
  readonly isWriting?: boolean
  readonly onAddToGroup?: (row: LedgerTransactionRow) => void
  readonly onRemoveFromGroup?: (row: LedgerTransactionRow) => void
  /** Offered on the group panel: opens the composer against the group on screen. */
  readonly onAddChild?: (group: LedgerGroupRow) => void
  readonly onRemoveChild?: (
    child: LedgerTransactionRow,
    group: LedgerGroupRow
  ) => void
}

export interface TransactionPanelViewProps {
  readonly transactionId: TransactionId | null
  /**
   * When set, the panel shows this group rather than a transaction. A group row is not a
   * transaction — it has no id the detail endpoint answers to — so it arrives whole.
   */
  readonly groupRow?: LedgerGroupRow | null
  readonly open: boolean
  readonly row?: LedgerTransactionRow | null
  readonly cursor?: DrawerCursorProps
  readonly group?: TransactionPanelGroupProps
  readonly onOpenChange: (open: boolean) => void
  readonly onOpenTransaction?: (transactionId: TransactionId) => void
  readonly onDeleted?: (transactionId: TransactionId) => void
  readonly onReviewed?: (transactionId: TransactionId) => void
}

export interface TransactionPanelProps {
  userId: UserId
  view: TransactionPanelViewProps
  editor: TransactionEditorController
  onSaved?: (mode: EditorMode) => void
}

/**
 * One sheet, four contents. Opening an editor over a still-open detail panel would mount a
 * second dialog with its own backdrop and its own focus trap; sharing this one makes edit a
 * swap of the surface's contents and lets closing an editor fall back to the detail view.
 */
export function TransactionPanel({
  userId,
  view,
  editor,
  onSaved,
}: TransactionPanelProps) {
  const groupRow = view.groupRow ?? null
  const showsGroup = groupRow !== null
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const editingGroup = showsGroup && editingGroupId === groupRow.groupId
  const editing = editor.isOpen && !showsGroup

  const editorPanel = useEditorPanel({
    userId,
    mode: editor.mode,
    open: editing,
    onOpenChange: editor.setOpen,
    resetKey: editor.instanceKey,
    ...(onSaved === undefined ? {} : { onSaved }),
  })

  const group = view.group ?? {}

  const groupEditorPanel = useGroupEditorPanel({
    userId,
    group: groupRow,
    open: editingGroup,
    onOpenChange: (next) => {
      if (!next) setEditingGroupId(null)
    },
    /**
     * A saved group leaves the sheet altogether rather than falling back to its detail: the
     * toast carrying Undo sits under an open sheet, so a reversal offered behind one could
     * not be taken.
     */
    onSaved: () => {
      setEditingGroupId(null)
      view.onOpenChange(false)
    },
    ...(view.onOpenTransaction === undefined
      ? {}
      : { onOpenChild: view.onOpenTransaction }),
  })

  const groupPanel = useGroupDrawerPanel({
    userId,
    group: groupRow,
    open: view.open && showsGroup && !editingGroup,
    onOpenChange: view.onOpenChange,
    onEdit: () => {
      if (groupRow !== null) setEditingGroupId(groupRow.groupId)
    },
    isGroupWriting: group.isWriting ?? false,
    ...(view.onOpenTransaction === undefined
      ? {}
      : { onOpenChild: view.onOpenTransaction }),
    ...(group.onAddChild === undefined ? {} : { onAddChild: group.onAddChild }),
    ...(group.onRemoveChild === undefined
      ? {}
      : {
          onRemoveChild: (transactionId: string, subject: LedgerGroupRow) => {
            const child = subject.children.find(
              (candidate) => candidate.transactionId === transactionId
            )
            if (child !== undefined) group.onRemoveChild?.(child, subject)
          },
        }),
  })

  const drawerPanel = useDrawerPanel({
    userId,
    transactionId: view.transactionId,
    open: view.open && !editing && !showsGroup,
    onOpenChange: view.onOpenChange,
    row: view.row ?? null,
    ...(view.cursor === undefined ? {} : { cursor: view.cursor }),
    groupLabel: group.label ?? null,
    isGroupWriting: group.isWriting ?? false,
    ...(group.onAddToGroup === undefined
      ? {}
      : { onAddToGroup: group.onAddToGroup }),
    ...(group.onRemoveFromGroup === undefined
      ? {}
      : { onRemoveFromGroup: group.onRemoveFromGroup }),
    onEdit: editor.openEdit,
    ...(view.onDeleted === undefined ? {} : { onDeleted: view.onDeleted }),
    ...(view.onReviewed === undefined ? {} : { onReviewed: view.onReviewed }),
  })

  const panel = showsGroup
    ? editingGroup
      ? groupEditorPanel
      : groupPanel
    : editing
      ? editorPanel
      : drawerPanel

  const inEditor = editing || editingGroup

  return (
    <AdaptiveSheet
      open={editing || view.open}
      onOpenChange={(next) => {
        if (next) return
        if (editing) {
          editorPanel.requestClose()
          return
        }
        if (editingGroup) {
          groupEditorPanel.requestClose()
          return
        }
        view.onOpenChange(false)
      }}
      eyebrow={panel.eyebrow}
      title={panel.title}
      {...(editing
        ? { initialFocus: editorPanel.initialFocus }
        : editingGroup
          ? { initialFocus: groupEditorPanel.initialFocus }
          : {})}
      {...(panel.width === undefined ? {} : { width: panel.width })}
      className={cn(
        inEditor ? EDITOR_SHEET_CLASS : DRAWER_SHEET_CLASS,
        "transition-[width] duration-base"
      )}
      headerActions={panel.headerActions}
      footer={panel.footer}
    >
      {panel.body}
    </AdaptiveSheet>
  )
}
