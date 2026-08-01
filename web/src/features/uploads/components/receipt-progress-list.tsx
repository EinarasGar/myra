import { CheckCircle2, FileWarning, ScanLine } from "lucide-react"

import type { IdentifiableQuickUploadResponse } from "@/api"
import { cn } from "@/lib/utils"
import { Truncate } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  isReceiptFailed,
  isReceiptReady,
  QUICK_UPLOAD_STATUS,
} from "@/features/transactions/review/api"

import { RECEIPT_READY_NOTE, receiptStepLabel } from "../copy"

function receiptTitle(upload: IdentifiableQuickUploadResponse): string {
  const data: unknown = upload.proposal_data
  if (typeof data === "object" && data !== null) {
    const description = (data as Record<string, unknown>)["description"]
    if (typeof description === "string" && description.trim() !== "") {
      return description
    }
  }
  return "Receipt"
}

function ReceiptGlyph({ upload }: { upload: IdentifiableQuickUploadResponse }) {
  if (isReceiptFailed(upload)) {
    return <FileWarning aria-hidden className="size-4 text-negative" />
  }
  if (isReceiptReady(upload)) {
    return <CheckCircle2 aria-hidden className="size-4 text-positive" />
  }
  if (upload.status === QUICK_UPLOAD_STATUS.processing) {
    return <Spinner className="size-4 text-brand" />
  }
  return <ScanLine aria-hidden className="size-4 text-ink-3" />
}

export function ReceiptProgressRow({
  upload,
  step,
  failure,
  onRetry,
  onDiscard,
  busy = false,
}: {
  upload: IdentifiableQuickUploadResponse
  step?: string | undefined
  failure?: string | undefined
  onRetry: () => void
  onDiscard: () => void
  busy?: boolean
}) {
  const failed = isReceiptFailed(upload)
  const ready = isReceiptReady(upload)
  const note = failed
    ? (failure ?? "Myra could not read this one.")
    : ready
      ? RECEIPT_READY_NOTE
      : step === undefined
        ? "Queued for Myra"
        : receiptStepLabel(step)

  return (
    <li
      data-slot="receipt-progress-row"
      data-status={upload.status}
      className="flex min-w-0 items-center gap-[11px] rounded-md border border-border px-[13px] py-[10px]"
    >
      <ReceiptGlyph upload={upload} />
      <div className="min-w-0 flex-1">
        <Truncate
          text={receiptTitle(upload)}
          className="block text-[12.5px] leading-[1.35] font-medium text-ink"
        />
        <Truncate
          text={note}
          className={cn(
            "mt-[2px] block text-[11px] leading-[1.45]",
            failed ? "text-negative" : ready ? "text-positive" : "text-ink-3"
          )}
        />
      </div>
      {failed ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
      {failed || ready ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={onDiscard}>
          Discard
        </Button>
      ) : null}
    </li>
  )
}

export function ReceiptProgressList({
  uploads,
  steps,
  failures,
  onRetry,
  onDiscard,
  busy = false,
  label,
}: {
  uploads: readonly IdentifiableQuickUploadResponse[]
  steps: Readonly<Record<string, string>>
  failures: Readonly<Record<string, string>>
  onRetry: (quickUploadId: string) => void
  onDiscard: (quickUploadId: string) => void
  busy?: boolean
  label: string
}) {
  if (uploads.length === 0) return null
  return (
    <ul
      data-slot="receipt-progress-list"
      aria-label={label}
      className="flex flex-col gap-[8px]"
    >
      {uploads.map((upload) => (
        <ReceiptProgressRow
          key={upload.id}
          upload={upload}
          step={steps[upload.id]}
          failure={failures[upload.id]}
          busy={busy}
          onRetry={() => {
            onRetry(upload.id)
          }}
          onDiscard={() => {
            onDiscard(upload.id)
          }}
        />
      ))}
    </ul>
  )
}
