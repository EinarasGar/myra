import { useState } from "react"

import { useShellWidth } from "@/components/layout/breakpoints"
import { focusRing } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { countOf } from "@/lib/format"
import type { TransactionId, UserId } from "@/lib/query"
import { cn } from "@/lib/utils"

import type { LedgerGroupRow } from "../api"
import { useDeleteTransactionGroup } from "../api"

import { DrawerSkeleton, FooterButton } from "./drawer-chrome"
import {
  GroupDrawerChildren,
  GroupDrawerDetails,
  GroupDrawerHero,
} from "./group-detail-view"
import type { DrawerPanelParts } from "./drawer-panel"
import { groupDeletedToast } from "./toasts"

export const GROUP_EDITOR_UNAVAILABLE =
  "Editing a group is not available from this panel."

export const GROUP_ADD_UNAVAILABLE =
  "Adding to a group is driven from the ledger, where the rows to add are picked."

export function groupDeleteWarning(count: number): string {
  return `Delete the group and the ${countOf(count, "transaction")} inside it?`
}

export interface GroupDrawerProps {
  userId: UserId
  group: LedgerGroupRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  onOpenChild?: (transactionId: TransactionId) => void
  onAddChild?: (group: LedgerGroupRow) => void
  onRemoveChild?: (transactionId: TransactionId, group: LedgerGroupRow) => void
  isGroupWriting?: boolean
}

export function useGroupDrawerPanel({
  userId,
  group,
  open,
  onOpenChange,
  onEdit,
  onOpenChild,
  onAddChild,
  onRemoveChild,
  isGroupWriting = false,
}: GroupDrawerProps): DrawerPanelParts {
  const width = useShellWidth()
  const [armed, setArmed] = useState(false)
  const removeGroup = useDeleteTransactionGroup(userId)

  if (!open && armed) setArmed(false)

  const confirmDelete = () => {
    if (group === null) return
    removeGroup.mutate(
      { groupId: group.groupId },
      {
        onSuccess: () => {
          groupDeletedToast({
            description: group.description.primary,
            count: group.childCount,
          })
          onOpenChange(false)
        },
      }
    )
    setArmed(false)
  }

  return {
    eyebrow: "Group",
    title: group?.description.primary ?? "Group",
    width: width === "stacked" ? 640 : 404,
    headerActions: (
      <button
        type="button"
        aria-label="Close"
        onClick={() => {
          onOpenChange(false)
        }}
        className={cn(
          "text-[14px] leading-none text-ink-3 outline-none",
          focusRing.chip
        )}
      >
        ✕
      </button>
    ),
    footer: (
      <>
        <FooterButton
          variant="primary"
          blockedReason={
            onEdit === undefined || group === null
              ? GROUP_EDITOR_UNAVAILABLE
              : null
          }
          onClick={onEdit}
        >
          Edit
        </FooterButton>
        <FooterButton
          variant="outline"
          blockedReason={
            onAddChild === undefined || group === null
              ? GROUP_ADD_UNAVAILABLE
              : null
          }
          onClick={
            onAddChild === undefined || group === null || isGroupWriting
              ? undefined
              : () => {
                  onAddChild(group)
                }
          }
        >
          Add transactions
        </FooterButton>
        <span className="flex-1" />
        {armed ? (
          <>
            <span className="text-[11px] leading-[1.4] text-ink-2">
              {groupDeleteWarning(group?.childCount ?? 0)}
            </span>
            <Button
              variant="outline"
              onClick={confirmDelete}
              disabled={removeGroup.isPending}
              className="h-auto rounded-button border-negative px-[14px] py-2 text-[12px] leading-none font-semibold text-negative"
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setArmed(false)
              }}
              className="h-auto rounded-sm px-2 py-2 text-[12px] leading-none font-semibold text-ink-2"
            >
              Cancel
            </Button>
          </>
        ) : (
          <FooterButton
            variant="danger"
            blockedReason={group === null ? "Nothing is loaded yet." : null}
            onClick={() => {
              setArmed(true)
            }}
          >
            Delete
          </FooterButton>
        )}
      </>
    ),
    body: (
      <div data-slot="group-drawer-body">
        {group === null ? (
          <DrawerSkeleton label="Loading this group" />
        ) : (
          <>
            <GroupDrawerHero group={group} />
            <GroupDrawerChildren
              group={group}
              isRemoving={isGroupWriting}
              {...(onOpenChild === undefined ? {} : { onOpenChild })}
              {...(onRemoveChild === undefined
                ? {}
                : {
                    onRemoveChild: (transactionId: string) => {
                      onRemoveChild(transactionId, group)
                    },
                  })}
            />
            <GroupDrawerDetails group={group} />
          </>
        )}
      </div>
    ),
  }
}
