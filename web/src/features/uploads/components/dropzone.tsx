import { useId, useRef, useState } from "react"
import { UploadCloud } from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives"
import { Button } from "@/components/ui/button"

import { DROPZONE_BODY, DROPZONE_CHOOSE, DROPZONE_HEADLINE } from "../copy"
import { formatBytes, type UploadPolicy } from "../policy"

export function Dropzone({
  policy,
  onFiles,
  disabled = false,
  headline = DROPZONE_HEADLINE,
  body = DROPZONE_BODY,
  className,
}: {
  policy: UploadPolicy
  onFiles: (files: FileList) => void
  disabled?: boolean
  headline?: string
  body?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [dragging, setDragging] = useState(false)

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  return (
    <div
      data-slot="dropzone"
      data-dragging={dragging ? "" : undefined}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return
        }
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (disabled) return
        if (event.dataTransfer.files.length > 0) {
          onFiles(event.dataTransfer.files)
        }
      }}
      onClick={openPicker}
      className={cn(
        "flex flex-col items-center rounded-panel border border-dashed border-border-strong px-6 py-[30px] text-center transition-colors duration-instant ease-out-quick",
        dragging && "border-brand bg-brand-dim",
        disabled && "opacity-60",
        className
      )}
    >
      <UploadCloud aria-hidden className="size-6 stroke-[1.4] text-ink-3" />
      <p className="mt-[9px] text-[13.5px] leading-[1.4] font-semibold text-ink">
        {headline}
      </p>
      <p
        id={hintId}
        className="mt-[3px] max-w-[320px] text-[12px] leading-[1.6] text-pretty text-ink-3"
      >
        {body} · {policy.typesLabel} up to {formatBytes(policy.maxBytes)}
      </p>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={cn("mt-[14px]", focusRing.button)}
        disabled={disabled}
        aria-describedby={hintId}
        onClick={openPicker}
      >
        {DROPZONE_CHOOSE}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={policy.accept}
        className="sr-only"
        tabIndex={-1}
        aria-label={DROPZONE_CHOOSE}
        onChange={(event) => {
          const { files } = event.target
          if (files !== null && files.length > 0) onFiles(files)
          event.target.value = ""
        }}
      />
    </div>
  )
}
