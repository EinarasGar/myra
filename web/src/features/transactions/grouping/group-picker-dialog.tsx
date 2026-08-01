import { useMemo, useState } from "react"

import { Figure } from "@/components/figure"
import { EntityPicker, type PickerOption } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateStamp } from "@/lib/format"
import type { UserId } from "@/lib/query"

import type { LedgerGroupRow, LedgerTransactionRow } from "../api"

import { useGroupSearch } from "./api"
import {
  ADD_TITLE,
  CANCEL,
  GROUP_PICKER_EMPTY,
  GROUP_PICKER_LABEL,
  GROUP_PICKER_PLACEHOLDER,
  SAVE_ADD,
  SAVING,
} from "./copy"
import type { GroupActions } from "./use-group-actions"

export const PICK_A_GROUP =
  "Pick the group this transaction should join. It keeps its own amount, account and date; the group's line is what the ledger shows."

function groupOption(group: LedgerGroupRow): PickerOption {
  return {
    value: group.groupId,
    label: group.description.primary,
    subLabel: `${formatDateStamp(group.date, { year: "always" })} · ${String(group.childCount)} ${group.childCount === 1 ? "transaction" : "transactions"}`,
  }
}

export function GroupPickerDialog({
  userId,
  row,
  open,
  onOpenChange,
  actions,
}: {
  userId: UserId
  row: LedgerTransactionRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: GroupActions
}) {
  const [groupId, setGroupId] = useState<string | null>(null)
  const search = useGroupSearch(userId, { enabled: open })

  const options = useMemo(
    () => search.results.map(groupOption),
    [search.results]
  )
  const picked = useMemo(
    () => search.results.find((group) => group.groupId === groupId) ?? null,
    [search.results, groupId]
  )

  const close = () => {
    setGroupId(null)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setGroupId(null)
        onOpenChange(next)
      }}
    >
      <DialogContent data-slot="group-picker-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ADD_TITLE}</DialogTitle>
          <DialogDescription>{PICK_A_GROUP}</DialogDescription>
        </DialogHeader>

        <EntityPicker
          label={GROUP_PICKER_LABEL}
          value={groupId}
          options={options}
          placeholder={GROUP_PICKER_PLACEHOLDER}
          emptyLabel={GROUP_PICKER_EMPTY}
          onValueChange={setGroupId}
          search={{
            query: search.query,
            onQueryChange: search.setQuery,
            pending: search.pending,
            hasMore: search.hasMore,
            onLoadMore: search.loadMore,
            total: search.total,
          }}
        />

        {picked === null ? null : (
          <p
            data-slot="group-picker-preview"
            className="text-[11.5px] leading-[1.5] text-pretty text-ink-3"
          >
            “{picked.description.primary}” becomes{" "}
            <Figure
              value={picked.childCount + 1}
              kind="plain"
              intent="meta"
              size="micro"
            />{" "}
            transactions in one ledger row.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            {CANCEL}
          </Button>
          <Button
            disabled={picked === null || row === null || actions.isAdding}
            onClick={() => {
              if (picked === null || row === null) return
              actions.addToGroup(
                picked,
                {
                  description: picked.raw.description,
                  date: picked.raw.date,
                  categoryId: picked.raw.category_id,
                  members: [row],
                },
                { onSuccess: close }
              )
            }}
          >
            {actions.isAdding ? SAVING : SAVE_ADD}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
