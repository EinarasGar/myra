import { useCallback } from "react"

import { getErrorMessage, normalizeError } from "@/lib/errors"
import type { UserId } from "@/lib/query"

import type { LedgerGroupRow, LedgerTransactionRow } from "../api"
import { useAddToGroup, useGroupTransactions, useRemoveFromGroup } from "../api"

import type { ResolvedGroupDraft } from "./members"
import { addedMemberIds, projectedGroup } from "./members"
import {
  addedToGroupToast,
  groupedToast,
  removedFromGroupToast,
  returnedToGroupToast,
  undoFailedToast,
  ungroupedToast,
} from "./toasts"

let provisionalCount = 0

function provisionalGroupId(): string {
  provisionalCount += 1
  return `provisional-group-${String(provisionalCount)}`
}

export interface GroupActions {
  readonly createGroup: (
    resolved: ResolvedGroupDraft,
    options?: { onSuccess?: () => void }
  ) => void
  readonly addToGroup: (
    group: LedgerGroupRow,
    resolved: ResolvedGroupDraft,
    options?: { onSuccess?: () => void }
  ) => void
  readonly removeFromGroup: (
    row: LedgerTransactionRow,
    group: LedgerGroupRow
  ) => void
  readonly isCreating: boolean
  readonly isAdding: boolean
  readonly isRemoving: boolean
}

/**
 * Undo never deletes anything. Every one of these writes is reversed by moving transactions
 * back out of — or back into — a group, because deleting a group deletes the transactions
 * inside it and a reversal that destroys a row is not a reversal.
 */
export function useGroupActions(userId: UserId): GroupActions {
  const group = useGroupTransactions(userId)
  const add = useAddToGroup(userId)
  const remove = useRemoveFromGroup(userId)

  const detachAll = useCallback(
    async (
      groupId: string,
      members: readonly LedgerTransactionRow[],
      onDone: () => void
    ) => {
      try {
        for (const member of members) {
          await remove.mutateAsync({ groupId, transaction: member.raw })
        }
        onDone()
      } catch (error) {
        undoFailedToast(getErrorMessage(normalizeError(error)))
      }
    },
    [remove]
  )

  const createGroup = useCallback(
    (
      resolved: ResolvedGroupDraft,
      options: { onSuccess?: () => void } = {}
    ) => {
      group.mutate(
        {
          provisionalGroupId: provisionalGroupId(),
          categoryId: resolved.categoryId,
          date: resolved.date,
          description: resolved.description,
          transactions: resolved.members.map((member) => member.raw),
        },
        {
          onSuccess: (response) => {
            const created = response.group.group_id
            groupedToast({
              count: resolved.members.length,
              description: resolved.description,
              onUndo: () => {
                void detachAll(created, resolved.members, () => {
                  ungroupedToast(resolved.members.length)
                })
              },
            })
            options.onSuccess?.()
          },
        }
      )
    },
    [group, detachAll]
  )

  const addToGroup = useCallback(
    (
      target: LedgerGroupRow,
      resolved: ResolvedGroupDraft,
      options: { onSuccess?: () => void } = {}
    ) => {
      const added = new Set(addedMemberIds(target, resolved))
      const addedMembers = resolved.members.filter((member) =>
        added.has(member.transactionId)
      )
      if (addedMembers.length === 0) {
        options.onSuccess?.()
        return
      }

      add.mutate(
        { group: projectedGroup(target, resolved) },
        {
          onSuccess: () => {
            addedToGroupToast({
              count: addedMembers.length,
              description: resolved.description,
              onUndo: () => {
                void detachAll(target.groupId, addedMembers, () => {
                  ungroupedToast(addedMembers.length)
                })
              },
            })
            options.onSuccess?.()
          },
        }
      )
    },
    [add, detachAll]
  )

  const removeFromGroup = useCallback(
    (row: LedgerTransactionRow, target: LedgerGroupRow) => {
      remove.mutate(
        { groupId: target.groupId, transaction: row.raw },
        {
          onSuccess: () => {
            removedFromGroupToast({
              description: row.description.primary,
              groupDescription: target.description.primary,
              onUndo: () => {
                add.mutate(
                  { group: target.raw },
                  {
                    onSuccess: () => {
                      returnedToGroupToast(row.description.primary)
                    },
                    onError: (error) => {
                      undoFailedToast(getErrorMessage(error))
                    },
                  }
                )
              },
            })
          },
        }
      )
    },
    [remove, add]
  )

  return {
    createGroup,
    addToGroup,
    removeFromGroup,
    isCreating: group.isPending,
    isAdding: add.isPending,
    isRemoving: remove.isPending,
  }
}
