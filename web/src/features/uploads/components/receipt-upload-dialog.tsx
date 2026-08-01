import { useMemo } from "react"

import type { UserId } from "@/lib/query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  isReceiptFailed,
  isReceiptReady,
  isReceiptWorking,
  useCompleteQuickUpload,
  useCreateQuickUpload,
  useQuickUploads,
  useQuickUploadWatcher,
  useRetryQuickUpload,
} from "@/features/transactions/review/api"

import {
  RECEIPT_DIALOG_BODY,
  RECEIPT_DIALOG_CLOSE,
  RECEIPT_DIALOG_GO_TO_REVIEW,
  RECEIPT_DIALOG_TITLE,
  RECEIPT_READING_TITLE,
} from "../copy"
import { RECEIPT_POLICY } from "../policy"
import { useUploadQueue } from "../use-upload-queue"
import { Dropzone } from "./dropzone"
import { ReceiptProgressList } from "./receipt-progress-list"
import { UploadList } from "./upload-list"

export function ReceiptUploadDialog({
  userId,
  open,
  onOpenChange,
  onReviewDrafts,
}: {
  userId: UserId
  open: boolean
  onOpenChange: (open: boolean) => void
  onReviewDrafts?: () => void
}) {
  const uploads = useQuickUploads(userId)
  const watcher = useQuickUploadWatcher(userId)
  const createQuickUpload = useCreateQuickUpload(userId)
  const retryQuickUpload = useRetryQuickUpload(userId)
  const completeQuickUpload = useCompleteQuickUpload(userId)

  const createAsync = createQuickUpload.mutateAsync
  const queue = useUploadQueue({
    userId,
    policy: RECEIPT_POLICY,
    onUploaded: async (fileId) => {
      await createAsync({ fileId })
    },
  })

  const active = useMemo(
    () =>
      (uploads.data ?? []).filter(
        (upload) =>
          isReceiptWorking(upload) ||
          isReceiptFailed(upload) ||
          isReceiptReady(upload)
      ),
    [uploads.data]
  )
  const readyCount = active.filter(isReceiptReady).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-[minmax(0,1fr)] gap-[18px] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{RECEIPT_DIALOG_TITLE}</DialogTitle>
          <DialogDescription className="text-[12px] leading-[1.6] text-pretty">
            {RECEIPT_DIALOG_BODY}
          </DialogDescription>
        </DialogHeader>

        <Dropzone policy={RECEIPT_POLICY} onFiles={queue.add} />

        <UploadList
          items={queue.items}
          queue={queue}
          label="Files being uploaded"
        />

        {active.length > 0 ? (
          <section className="flex flex-col gap-[9px]">
            <h3 className="text-[10px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase">
              {RECEIPT_READING_TITLE}
            </h3>
            <ReceiptProgressList
              uploads={active}
              steps={watcher.steps}
              failures={watcher.failures}
              busy={retryQuickUpload.isPending || completeQuickUpload.isPending}
              label={RECEIPT_READING_TITLE}
              onRetry={(quickUploadId) => {
                watcher.clearFailure(quickUploadId)
                retryQuickUpload.mutate({ quickUploadId })
              }}
              onDiscard={(quickUploadId) => {
                completeQuickUpload.mutate({ quickUploadId, accepted: false })
              }}
            />
          </section>
        ) : null}

        <DialogFooter>
          {onReviewDrafts === undefined ? null : (
            <Button
              variant="outline"
              size="lg"
              disabled={readyCount === 0}
              onClick={onReviewDrafts}
            >
              {readyCount === 0
                ? RECEIPT_DIALOG_GO_TO_REVIEW
                : `${RECEIPT_DIALOG_GO_TO_REVIEW} (${String(readyCount)})`}
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {RECEIPT_DIALOG_CLOSE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
