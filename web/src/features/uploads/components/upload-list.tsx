import { FileText, ImageIcon, RotateCcw, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Progress } from "@/components/ui/progress"

import { uploadPhaseLabel } from "../copy"
import { formatBytes, isImageType } from "../policy"
import type { UploadItem, UploadQueue } from "../use-upload-queue"
import {
  isUploadInFlight,
  isUploadRetryable,
  UPLOAD_PHASES,
} from "../use-upload-queue"

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done"

function attachmentState(item: UploadItem): AttachmentState {
  switch (item.phase) {
    case UPLOAD_PHASES.rejected:
    case UPLOAD_PHASES.failed:
      return "error"
    case UPLOAD_PHASES.canceled:
      return "idle"
    case UPLOAD_PHASES.linking:
      return "processing"
    case UPLOAD_PHASES.done:
      return "done"
    default:
      return "uploading"
  }
}

function describe(item: UploadItem): string {
  if (item.reason !== null) return item.reason
  if (item.phase === UPLOAD_PHASES.uploading) {
    return `${uploadPhaseLabel(item.phase)} · ${String(Math.round(item.progress * 100))}%`
  }
  return `${uploadPhaseLabel(item.phase)} · ${formatBytes(item.size)}`
}

export function UploadRow({
  item,
  queue,
  size = "sm",
}: {
  item: UploadItem
  queue: Pick<UploadQueue, "cancel" | "retry" | "dismiss">
  size?: "default" | "sm" | "xs"
}) {
  const inFlight = isUploadInFlight(item.phase)
  const showProgress =
    item.phase === UPLOAD_PHASES.uploading ||
    item.phase === UPLOAD_PHASES.registering

  return (
    <Attachment
      data-testid={`upload-${item.id}`}
      state={attachmentState(item)}
      size={size}
      className="w-full max-w-full min-w-0"
    >
      <AttachmentMedia variant={item.previewUrl === null ? "icon" : "image"}>
        {item.previewUrl === null ? (
          isImageType(item.mimeType) ? (
            <ImageIcon aria-hidden />
          ) : (
            <FileText aria-hidden />
          )
        ) : (
          <img src={item.previewUrl} alt="" />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{item.name}</AttachmentTitle>
        <AttachmentDescription
          className={cn(
            item.phase === UPLOAD_PHASES.done && "text-positive",
            item.phase === UPLOAD_PHASES.canceled && "text-ink-3"
          )}
        >
          {describe(item)}
        </AttachmentDescription>
        {showProgress ? (
          <Progress
            className="mt-[7px]"
            value={Math.round(item.progress * 100)}
            aria-label={`${item.name} upload progress`}
          />
        ) : null}
      </AttachmentContent>
      <AttachmentActions>
        {isUploadRetryable(item.phase) ? (
          <AttachmentAction
            aria-label={`Retry ${item.name}`}
            onClick={() => {
              queue.retry(item.id)
            }}
          >
            <RotateCcw aria-hidden />
          </AttachmentAction>
        ) : null}
        <AttachmentAction
          aria-label={inFlight ? `Cancel ${item.name}` : `Remove ${item.name}`}
          onClick={() => {
            if (inFlight) {
              queue.cancel(item.id)
              return
            }
            queue.dismiss(item.id)
          }}
        >
          <X aria-hidden />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  )
}

export function UploadList({
  items,
  queue,
  orientation = "stack",
  size = "sm",
  label,
}: {
  items: readonly UploadItem[]
  queue: Pick<UploadQueue, "cancel" | "retry" | "dismiss">
  orientation?: "stack" | "row"
  size?: "default" | "sm" | "xs"
  label?: string
}) {
  if (items.length === 0) return null

  if (orientation === "row") {
    return (
      <AttachmentGroup aria-label={label} data-slot="upload-list">
        {items.map((item) => (
          <UploadRow key={item.id} item={item} queue={queue} size={size} />
        ))}
      </AttachmentGroup>
    )
  }

  return (
    <ul
      data-slot="upload-list"
      aria-label={label}
      className="flex min-w-0 flex-col gap-[9px]"
    >
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <UploadRow item={item} queue={queue} size={size} />
        </li>
      ))}
    </ul>
  )
}
