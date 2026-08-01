import { useEffect, useRef, useState } from "react"
import { Paperclip, Square } from "lucide-react"

import { cn } from "@/lib/utils"
import type { UserId } from "@/lib/query"
import { KEYBOARD_ONLY } from "@/components/layout/breakpoints"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { UploadItem } from "@/features/uploads"
import {
  ATTACH_FILE_INPUT_LABEL,
  ATTACH_LABEL,
  ATTACHMENT_POLICY,
  ATTACHMENTS_STILL_UPLOADING,
  discardUploadedFile,
  UPLOAD_PHASES,
  UploadList,
  useUploadQueue,
} from "@/features/uploads"

import type { ChatAttachment } from "../api"
import { COMPOSER_FOOT, COMPOSER_PLACEHOLDER, SEND, STOP } from "../copy"

function readyAttachments(
  items: readonly UploadItem[]
): readonly ChatAttachment[] {
  return items.flatMap((item) =>
    item.phase === UPLOAD_PHASES.done && item.fileId !== null
      ? [{ fileId: item.fileId, name: item.name }]
      : []
  )
}

export function Composer({
  userId,
  streaming,
  draft,
  onDraftChange,
  onSend,
  onStop,
}: {
  userId: UserId
  streaming: boolean
  draft: string
  onDraftChange: (value: string) => void
  onSend: (message: string, attachments: readonly ChatAttachment[]) => void
  onStop: () => void
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const queue = useUploadQueue({
    userId,
    policy: ATTACHMENT_POLICY,
    onRemoved: (fileId) => {
      void discardUploadedFile(userId, fileId)
    },
  })

  useEffect(() => {
    if (draft !== "") inputRef.current?.focus()
  }, [draft])

  const attachments = readyAttachments(queue.items)
  const canSend =
    !streaming &&
    !queue.isBusy &&
    (draft.trim() !== "" || attachments.length > 0)

  const submit = () => {
    if (!canSend) return
    onSend(draft.trim(), attachments)
    onDraftChange("")
    queue.clearSettled()
  }

  return (
    <div data-slot="myra-composer">
      <div
        className={cn(
          "overflow-hidden rounded-[10px] border bg-surface transition-colors duration-instant ease-out-quick",
          focused ? "border-brand" : "border-border-strong"
        )}
      >
        {queue.items.length > 0 ? (
          <div className="border-b border-border px-[13px] py-[10px]">
            <UploadList
              items={queue.items}
              queue={queue}
              orientation="row"
              size="xs"
              label="Attachments"
            />
          </div>
        ) : null}
        <div className="flex items-end gap-3 p-[13px]">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={ATTACH_LABEL}
            disabled={streaming}
            onClick={() => {
              fileRef.current?.click()
            }}
          >
            <Paperclip aria-hidden />
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ATTACHMENT_POLICY.accept}
            className="sr-only"
            tabIndex={-1}
            aria-label={ATTACH_FILE_INPUT_LABEL}
            onChange={(event) => {
              const { files } = event.target
              if (files !== null && files.length > 0) queue.add(files)
              event.target.value = ""
            }}
          />
          <Textarea
            ref={inputRef}
            rows={1}
            value={draft}
            aria-label={COMPOSER_PLACEHOLDER}
            placeholder={COMPOSER_PLACEHOLDER}
            onFocus={() => {
              setFocused(true)
            }}
            onBlur={() => {
              setFocused(false)
            }}
            onChange={(event) => {
              onDraftChange(event.target.value)
            }}
            onPaste={(event) => {
              const pasted = Array.from(event.clipboardData.files)
              if (pasted.length === 0) return
              event.preventDefault()
              queue.add(pasted)
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return
              if (event.nativeEvent.isComposing) return
              event.preventDefault()
              submit()
            }}
            className="max-h-40 min-h-[24px] resize-none border-0 bg-transparent p-0 text-[13px] leading-[1.5] shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {streaming ? (
            <Button size="lg" variant="outline" onClick={onStop}>
              <Square data-icon="inline-start" aria-hidden />
              {STOP}
            </Button>
          ) : (
            <Button size="lg" disabled={!canSend} onClick={submit}>
              {SEND}
              <span
                className={cn(
                  KEYBOARD_ONLY,
                  "font-mono text-[10px] leading-none font-semibold opacity-[0.72]"
                )}
                data-icon="inline-end"
              >
                ⏎
              </span>
            </Button>
          )}
        </div>
      </div>
      <p className="mt-[9px] text-center text-[10.5px] leading-[1.5] text-pretty text-ink-3">
        {queue.isBusy ? ATTACHMENTS_STILL_UPLOADING : COMPOSER_FOOT}
      </p>
    </div>
  )
}
