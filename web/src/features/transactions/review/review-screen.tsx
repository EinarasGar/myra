import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Camera, Inbox } from "lucide-react"

import { useUserId } from "@/auth"
import { countOf, pluralise } from "@/lib/format"
import { Figure } from "@/components/figure"
import { ErrorStateFor } from "@/components/layout/error-states"
import { EmptyState } from "@/components/states/empty-state"
import { ConfirmState } from "@/components/states/message-state"
import { Panel, PanelFootnote } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { ReceiptUploadDialog, SNAP_A_RECEIPT } from "@/features/uploads"

import type { LedgerTransactionRow, VisibilitySubject } from "../api"
import {
  inverseIntent,
  useApplyVisibility,
  useDeleteTransaction,
  writtenSubjects,
} from "../api"
import { TransactionPanel } from "../drawer"
import { deletedToast, markedReviewedToast, restoredToast } from "../drawer"
import type { TransactionEditorController } from "../editor"
import type { ReviewItem, ReviewQueueView } from "./api"
import { useCompleteQuickUpload, useReviewItems } from "./api"
import { ReviewCard } from "./review-card"
import { ReviewProgress } from "./review-progress"
import { ReviewQueueList, ReviewQueueNote } from "./review-queue-list"
import { ReviewSkeleton } from "./skeletons"
import { useReviewCursor } from "./use-review-cursor"
import { useReviewKeyboard } from "./use-review-keyboard"

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-[10px] px-[2px] pt-[22px] pb-[10px]">
      <span className="flex-none text-[10px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}

function importSubjectsOf(view: ReviewQueueView): VisibilitySubject[] {
  return view.items.flatMap((item) =>
    item.source === "import" && item.row !== null
      ? [
          {
            transactionId: item.row.transactionId,
            visibility: item.row.visibility,
          },
        ]
      : []
  )
}

export function ReviewScreen({
  editor,
  uploadOpen = false,
  onUploadOpenChange,
}: {
  editor: TransactionEditorController
  uploadOpen?: boolean
  onUploadOpenChange?: (open: boolean) => void
}) {
  const userId = useUserId()
  const navigate = useNavigate()
  const queue = useReviewItems(userId)
  const [localUploadOpen, setLocalUploadOpen] = useState(false)
  const cursor = useReviewCursor(queue.view.items)
  const [armedForDiscard, setArmedForDiscard] = useState(false)
  const [drawerRow, setDrawerRow] = useState<LedgerTransactionRow | null>(null)

  const visibility = useApplyVisibility(userId)
  const deleteTransaction = useDeleteTransaction(userId)
  const completeUpload = useCompleteQuickUpload(userId)

  const item = cursor.item
  const isBusy =
    visibility.isPending ||
    deleteTransaction.isPending ||
    completeUpload.isPending

  const markReviewed = useCallback(
    (subjects: readonly VisibilitySubject[], description: string) => {
      visibility.applyIntent(subjects, "markReviewed", {
        onSuccess: (plan) => {
          markedReviewedToast({
            description,
            onUndo: () => {
              visibility.applyIntent(
                writtenSubjects(plan),
                inverseIntent(plan.intent),
                {
                  onSuccess: () => {
                    restoredToast(description)
                  },
                }
              )
            },
          })
        },
      })
    },
    [visibility]
  )

  const onConfirm = useCallback(() => {
    if (item === null || item.actions.confirm.blockedReason !== null) return
    if (item.source === "import" && item.row !== null) {
      markReviewed(
        [
          {
            transactionId: item.row.transactionId,
            visibility: item.row.visibility,
          },
        ],
        item.title
      )
      return
    }
    if (item.source === "receipt" && item.quickUploadId !== null) {
      completeUpload.mutate({
        quickUploadId: item.quickUploadId,
        accepted: true,
      })
    }
  }, [completeUpload, item, markReviewed])

  const onEdit = useCallback(() => {
    if (item === null || item.actions.edit.blockedReason !== null) return
    if (item.row !== null) editor.openEdit(item.row.transactionId)
  }, [editor, item])

  const onSkip = useCallback(() => {
    setArmedForDiscard(false)
    cursor.next()
  }, [cursor])

  const onDiscardPressed = useCallback(() => {
    if (item === null || item.actions.discard.blockedReason !== null) return
    if (!armedForDiscard) {
      setArmedForDiscard(true)
      return
    }
    setArmedForDiscard(false)
    if (item.source === "import" && item.transactionId !== null) {
      deleteTransaction.mutate(
        { transactionId: item.transactionId },
        {
          onSuccess: () => {
            deletedToast(item.title)
          },
        }
      )
      return
    }
    if (item.source === "receipt" && item.quickUploadId !== null) {
      completeUpload.mutate({
        quickUploadId: item.quickUploadId,
        accepted: false,
      })
    }
  }, [armedForDiscard, completeUpload, deleteTransaction, item])

  const bulkLabel = useMemo(() => {
    if (item === null || item.source !== "import") return null
    const count = queue.view.sourceCounts.import
    if (count < 2) return null
    return `Mark all ${countOf(count, "unreviewed import")} reviewed`
  }, [item, queue.view.sourceCounts.import])

  const onBulk = useCallback(() => {
    const subjects = importSubjectsOf(queue.view)
    markReviewed(subjects, countOf(subjects.length, "import"))
  }, [markReviewed, queue.view])

  const goExplore = useCallback(() => {
    void navigate({ to: "/transactions", search: { mode: "explore" } })
  }, [navigate])

  const isUploadOpen = uploadOpen || localUploadOpen
  const setUploadOpen = useCallback(
    (open: boolean) => {
      setLocalUploadOpen(open)
      onUploadOpenChange?.(open)
    },
    [onUploadOpenChange]
  )
  const openUpload = useCallback(() => {
    setUploadOpen(true)
  }, [setUploadOpen])

  const snapAction = {
    label: SNAP_A_RECEIPT,
    onClick: openUpload,
  }

  useReviewKeyboard(
    {
      onConfirm,
      onEdit,
      onSkip,
      onDelete: onDiscardPressed,
      onNext: cursor.next,
      onPrevious: cursor.previous,
    },
    item !== null && drawerRow === null && !editor.isOpen
  )

  const panel = (
    <TransactionPanel
      userId={userId}
      editor={editor}
      view={{
        transactionId: drawerRow?.transactionId ?? null,
        open: drawerRow !== null,
        row: drawerRow,
        onOpenChange: (open) => {
          if (!open) setDrawerRow(null)
        },
        onDeleted: () => {
          setDrawerRow(null)
        },
        onReviewed: () => {
          setDrawerRow(null)
        },
      }}
    />
  )

  const uploadDialog = (
    <ReceiptUploadDialog
      userId={userId}
      open={isUploadOpen}
      onOpenChange={setUploadOpen}
      onReviewDrafts={() => {
        setUploadOpen(false)
      }}
    />
  )

  const chrome = (
    <>
      {panel}
      {uploadDialog}
    </>
  )

  if (queue.isPending) {
    return (
      <>
        <ReviewSkeleton />
        {chrome}
      </>
    )
  }

  if (queue.isError) {
    return (
      <>
        <ErrorStateFor error={queue.error} onRetry={queue.refetch} />
        {chrome}
      </>
    )
  }

  const footnotes = [
    queue.view.countIsLowerBound
      ? `Nothing filters the ledger by review state, so this queue counts only the ${countOf(queue.ledgerLoadedCount, "row")} loaded so far. There may be more further back.`
      : null,
    queue.view.receiptsUnavailable
      ? "Receipts could not be loaded, so any that are ready are missing from this queue. Imports are unaffected."
      : null,
    queue.view.receiptsWorking > 0
      ? `${countOf(queue.view.receiptsWorking, "more receipt")} ${pluralise(queue.view.receiptsWorking, "is", "are")} still being read — they join the queue on their own.`
      : null,
    queue.view.receiptsFailed > 0
      ? `${countOf(queue.view.receiptsFailed, "upload")} failed to read and ${pluralise(queue.view.receiptsFailed, "is", "are")} not in this queue.`
      : null,
    queue.view.mockIds.length > 0
      ? "Myra proposals are illustrative: nothing lists pending proposals across conversations yet, so those cards cannot be approved or denied from here."
      : null,
  ].filter((note): note is string => note !== null)

  if (queue.view.count === 0) {
    return (
      <>
        <EmptyState
          size="page"
          icon={<Inbox aria-hidden />}
          headline={
            queue.ledgerLoadedCount === 0
              ? "Nothing to review yet"
              : queue.view.countIsLowerBound
                ? "Nothing so far"
                : "Nothing is waiting on you"
          }
          body={
            queue.ledgerLoadedCount === 0
              ? "Once transactions arrive — imported, uploaded or proposed by Myra — they queue up here one at a time."
              : queue.view.countIsLowerBound
                ? `Nothing is waiting in the ${countOf(queue.ledgerLoadedCount, "row")} read so far. Older transactions have not been checked, so look further back before calling it done.`
                : "Every import, receipt and proposal Sverto can see has been dealt with."
          }
          actions={
            queue.view.countIsLowerBound
              ? [
                  {
                    label: queue.isLoadingMore
                      ? "Looking…"
                      : "Look further back",
                    kind: "primary" as const,
                    onClick: queue.loadMore,
                  },
                  snapAction,
                  { label: "Back to Explore", onClick: goExplore },
                ]
              : [
                  { ...snapAction, kind: "primary" as const },
                  { label: "Back to Explore", onClick: goExplore },
                ]
          }
          {...(footnotes.length > 0 ? { footnote: footnotes.join(" ") } : {})}
        />
        {chrome}
      </>
    )
  }

  if (cursor.isDone || item === null) {
    return (
      <>
        <ConfirmState
          headline="That's the end of this pass"
          body={
            queue.view.countIsLowerBound
              ? `You have seen the ${countOf(queue.view.count, "item")} this queue has found so far. Skipped items stay in the queue until you confirm or delete them, and looking further back may turn up more.`
              : `You have seen all ${countOf(queue.view.count, "item")} waiting. Skipped items stay in the queue until you confirm or delete them.`
          }
          actions={[
            { label: "Start over", kind: "primary", onClick: cursor.restart },
            snapAction,
            { label: "Back to Explore", onClick: goExplore },
          ]}
          {...(footnotes.length > 0 ? { footnote: footnotes.join(" ") } : {})}
        />
        {chrome}
      </>
    )
  }

  return (
    <div data-slot="review-screen">
      <div className="flex justify-end pb-[10px]">
        <Button variant="outline" size="lg" onClick={openUpload}>
          <Camera data-icon="inline-start" aria-hidden />
          {SNAP_A_RECEIPT}
        </Button>
      </div>

      <ReviewProgress
        position={cursor.position}
        total={cursor.total}
        totalIsLowerBound={queue.view.countIsLowerBound}
        onSkipAll={goExplore}
      />

      <ReviewCard
        item={item}
        onConfirm={onConfirm}
        onEdit={onEdit}
        onSkip={onSkip}
        onDiscard={onDiscardPressed}
        onCancelDiscard={() => {
          setArmedForDiscard(false)
        }}
        armedForDiscard={armedForDiscard}
        isBusy={isBusy}
        bulkLabel={bulkLabel}
        onBulk={onBulk}
      />

      <SectionHeader label="Up next" />

      <Panel>
        {cursor.upNext.length === 0 ? (
          <p className="px-[18px] py-[22px] text-center text-[12px] leading-[1.6] text-ink-3">
            This is the last item in the queue.
          </p>
        ) : (
          <ReviewQueueList
            items={cursor.upNext}
            onSelect={(selected: ReviewItem) => {
              setArmedForDiscard(false)
              if (selected.row !== null) setDrawerRow(selected.row)
            }}
            onShowAll={goExplore}
          />
        )}
        <PanelFootnote>
          <ReviewQueueNote>{queue.view.summary}</ReviewQueueNote>
        </PanelFootnote>
      </Panel>

      {footnotes.length > 0 ? (
        <div
          data-slot="review-footnotes"
          className="mt-[10px] flex flex-col gap-[6px]"
        >
          {footnotes.map((note) => (
            <p
              key={note}
              className="text-[11px] leading-[1.5] text-pretty text-ink-3"
            >
              {note}
            </p>
          ))}
        </div>
      ) : null}

      {queue.hasMoreLedger ? (
        <div className="mt-3 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={queue.loadMore}
            disabled={queue.isLoadingMore}
            className="h-auto rounded-sm px-[13px] py-[7px] text-[11.5px] leading-none font-semibold"
          >
            {queue.isLoadingMore ? "Looking…" : "Look further back"}
          </Button>
          <span className="text-[11px] leading-[1.5] text-ink-3">
            Loads the next page of the ledger and adds any unreviewed
            transactions it finds.{" "}
            <Figure kind="plain" value={queue.ledgerLoadedCount} /> loaded so
            far.
          </span>
        </div>
      ) : null}

      {chrome}
    </div>
  )
}
