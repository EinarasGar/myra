import type { ReactNode } from "react"
import { useMemo, useState } from "react"

import type { RequiredIdentifiableTransaction } from "@/api"
import type { TransactionId, UserId } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useShellWidth } from "@/components/layout/breakpoints"
import { ErrorStateFor } from "@/components/layout/error-states"
import { focusRing } from "@/components/primitives"

import type { LedgerTransactionRow, TransactionDetail } from "../api"
import {
  inverseIntent,
  toTransactionRow,
  useApplyVisibility,
  useDeleteTransaction,
  useTransactionDetail,
  writtenSubjects,
} from "../api"
import { DrawerSkeleton, FooterButton, StepButton } from "./drawer-chrome"
import { deletedToast, markedReviewedToast, restoredToast } from "./toasts"
import {
  DrawerDetails,
  DrawerEntries,
  DrawerHero,
} from "./transaction-detail-view"

const EDITOR_UNAVAILABLE = "Editing is not available from this panel."

const GROUPING_UNAVAILABLE =
  "Grouping is driven from the ledger, where the rows to group are picked."

const GROUP_UNKNOWN =
  "The group this belongs to is not loaded here, so it cannot be edited from this panel."

function detailRow(
  detail: TransactionDetail,
  transactionId: TransactionId
): LedgerTransactionRow {
  const transaction = {
    ...detail.raw.transaction,
    transaction_id: transactionId,
  } as RequiredIdentifiableTransaction
  return toTransactionRow(transaction, detail.lookup)
}

export interface DrawerCursorProps {
  readonly position: number
  readonly total: number
  readonly totalIsLowerBound: boolean
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly isLoadingMore: boolean
  readonly onStep: (delta: number) => void
}

function stepperLabel(cursor: DrawerCursorProps): string {
  const of = `${String(cursor.position)} of ${String(cursor.total)}`
  if (cursor.isLoadingMore) return `Transaction ${of}, loading more`
  return cursor.totalIsLowerBound
    ? `Transaction ${of} loaded so far`
    : `Transaction ${of}`
}

export interface TransactionDrawerProps {
  userId: UserId
  transactionId: TransactionId | null
  open: boolean
  onOpenChange: (open: boolean) => void
  row?: LedgerTransactionRow | null
  cursor?: DrawerCursorProps
  onEdit?: (transactionId: TransactionId) => void
  onAddToGroup?: (row: LedgerTransactionRow) => void
  /**
   * Absent when the parent group is not on screen: the move-out rewrites the group's whole
   * membership, so it cannot be offered against a group whose other members are unknown.
   */
  onRemoveFromGroup?: (row: LedgerTransactionRow) => void
  groupLabel?: string | null
  isGroupWriting?: boolean
  onDeleted?: (transactionId: TransactionId) => void
  onReviewed?: (transactionId: TransactionId) => void
}

export interface DrawerPanelParts {
  readonly eyebrow: ReactNode
  readonly title: ReactNode
  readonly width: number
  readonly headerActions: ReactNode
  readonly footer: ReactNode
  readonly body: ReactNode
}

export function useDrawerPanel({
  userId,
  transactionId,
  open,
  onOpenChange,
  row: providedRow = null,
  cursor,
  onEdit,
  onAddToGroup,
  onRemoveFromGroup,
  groupLabel = null,
  isGroupWriting = false,
  onDeleted,
  onReviewed,
}: TransactionDrawerProps): DrawerPanelParts {
  const width = useShellWidth()
  const [armedFor, setArmedFor] = useState<TransactionId | null>(null)
  const detail = useTransactionDetail({
    userId,
    transactionId: transactionId ?? "",
    enabled: open && transactionId !== null,
  })
  const deleteTransaction = useDeleteTransaction(userId)
  const visibility = useApplyVisibility(userId)

  const fetchedRow = useMemo(() => {
    if (detail.detail === undefined || transactionId === null) return null
    return detailRow(detail.detail, transactionId)
  }, [detail.detail, transactionId])

  const row = providedRow ?? fetchedRow
  const armedForDelete = armedFor !== null && armedFor === transactionId
  const title = row?.description.primary ?? "Transaction"

  const markReviewed = () => {
    if (transactionId === null || row === null) return
    visibility.applyIntent(
      [{ transactionId, visibility: row.visibility }],
      "markReviewed",
      {
        onSuccess: (plan) => {
          markedReviewedToast({
            description: row.description.primary,
            onUndo: () => {
              visibility.applyIntent(
                writtenSubjects(plan),
                inverseIntent(plan.intent),
                {
                  onSuccess: () => {
                    restoredToast(row.description.primary)
                  },
                }
              )
            },
          })
          onReviewed?.(transactionId)
        },
      }
    )
  }

  const confirmDelete = () => {
    if (transactionId === null || row === null) return
    deleteTransaction.mutate(
      { transactionId },
      {
        onSuccess: () => {
          deletedToast(row.description.primary)
          onDeleted?.(transactionId)
        },
      }
    )
    setArmedFor(null)
  }

  return {
    eyebrow: "Transaction",
    title,
    width: width === "stacked" ? 640 : 404,
    headerActions: (
      <>
        {cursor ? (
          <span data-slot="drawer-stepper" className="flex items-center gap-2">
            <StepButton
              label="Previous transaction"
              glyph="↑"
              disabled={!cursor.canStepBack}
              onClick={() => {
                cursor.onStep(-1)
              }}
            />
            <StepButton
              label="Next transaction"
              glyph="↓"
              disabled={!cursor.canStepForward}
              onClick={() => {
                cursor.onStep(1)
              }}
            />
            <span
              aria-label={stepperLabel(cursor)}
              className="flex items-baseline gap-1 font-mono text-[11px] leading-none font-medium text-ink-3 tabular-nums"
            >
              <span aria-hidden>
                {cursor.position} / {cursor.total}
              </span>
              {cursor.totalIsLowerBound ? (
                <span aria-hidden className="text-[9.5px] font-normal">
                  {cursor.isLoadingMore ? "loading…" : "loaded"}
                </span>
              ) : null}
            </span>
          </span>
        ) : null}
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
      </>
    ),
    footer: (
      <>
        <FooterButton
          variant="primary"
          blockedReason={onEdit === undefined ? EDITOR_UNAVAILABLE : null}
          onClick={
            onEdit === undefined || transactionId === null
              ? undefined
              : () => {
                  onEdit(transactionId)
                }
          }
        >
          Edit
        </FooterButton>
        {row !== null && row.groupId !== null ? (
          <FooterButton
            variant="outline"
            blockedReason={
              onRemoveFromGroup === undefined ? GROUP_UNKNOWN : null
            }
            onClick={
              onRemoveFromGroup === undefined || isGroupWriting
                ? undefined
                : () => {
                    onRemoveFromGroup(row)
                  }
            }
          >
            Remove from group
          </FooterButton>
        ) : (
          <FooterButton
            variant="outline"
            blockedReason={
              onAddToGroup === undefined ? GROUPING_UNAVAILABLE : null
            }
            onClick={
              onAddToGroup === undefined || row === null || isGroupWriting
                ? undefined
                : () => {
                    onAddToGroup(row)
                  }
            }
          >
            Add to group
          </FooterButton>
        )}
        <span className="flex-1" />
        {armedForDelete ? (
          <>
            <span className="text-[11px] leading-[1.4] text-ink-2">
              Delete permanently?
            </span>
            <Button
              variant="outline"
              onClick={confirmDelete}
              disabled={deleteTransaction.isPending}
              className="h-auto rounded-button border-negative px-[14px] py-2 text-[12px] leading-none font-semibold text-negative"
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setArmedFor(null)
              }}
              className="h-auto rounded-sm px-2 py-2 text-[12px] leading-none font-semibold text-ink-2"
            >
              Cancel
            </Button>
          </>
        ) : (
          <FooterButton
            variant="danger"
            blockedReason={row === null ? "Nothing is loaded yet." : null}
            onClick={() => {
              setArmedFor(transactionId)
            }}
          >
            Delete
          </FooterButton>
        )}
      </>
    ),
    body: (
      <div
        data-slot="drawer-body"
        onKeyDown={(event) => {
          if (cursor === undefined) return
          if (event.key === "ArrowDown" || event.key === "j") {
            event.preventDefault()
            cursor.onStep(1)
          }
          if (event.key === "ArrowUp" || event.key === "k") {
            event.preventDefault()
            cursor.onStep(-1)
          }
        }}
      >
        {row === null ? (
          detail.isError ? (
            <div className="p-5">
              <ErrorStateFor error={detail.error} onRetry={detail.refetch} />
            </div>
          ) : (
            <DrawerSkeleton />
          )
        ) : (
          <>
            <DrawerHero
              row={row}
              onMarkReviewed={markReviewed}
              isMarkingReviewed={visibility.isPending}
            />
            <DrawerEntries row={row} />
            <DrawerDetails row={row} groupLabel={groupLabel} />
          </>
        )}
      </div>
    ),
  }
}

export const DRAWER_SHEET_CLASS = "[&_[data-slot=adaptive-sheet-body]]:p-0"
