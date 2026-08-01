import { Clock, TriangleAlert } from "lucide-react"

import type { NormalizedRateLimitedError } from "@/lib/errors"
import { formatDateTimeStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives"

import type { ErrorPart } from "../api"
import { RATE_LIMITED_UNTIL, RETRY, STREAM_FAILED } from "../copy"

export function RateLimitBanner({
  error,
  onDismiss,
}: {
  error: NormalizedRateLimitedError
  onDismiss: () => void
}) {
  const resetAt = error.resetAt ?? error.ai?.reset_at ?? null
  const retryAfter = error.retryAfterSeconds

  return (
    <div
      role="status"
      data-slot="myra-rate-limit"
      data-testid="rate-limit"
      className="mb-[11px] flex flex-wrap items-center gap-[11px] rounded-md border border-attention bg-attention-dim px-[14px] py-[11px]"
    >
      <Clock className="size-[14px] flex-none text-attention" aria-hidden />
      <p className="min-w-0 flex-1 text-[12px] leading-[1.5] text-pretty text-ink-2">
        {error.message}
        {resetAt === null ? null : (
          <>
            {" "}
            {RATE_LIMITED_UNTIL} {formatDateTimeStamp(resetAt)}.
          </>
        )}
        {resetAt === null && retryAfter !== undefined ? (
          <>
            {" "}
            {RATE_LIMITED_UNTIL} {String(retryAfter)}s.
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "flex-none text-[11.5px] leading-none font-semibold whitespace-nowrap text-ink-2",
          focusRing.chip
        )}
      >
        Dismiss
      </button>
    </div>
  )
}

export function StreamErrorNote({
  error,
  onRetry,
}: {
  error: ErrorPart
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      data-slot="myra-stream-error"
      className="flex flex-wrap items-start gap-[10px] rounded-md border border-border bg-surface px-[14px] py-[11px]"
    >
      <TriangleAlert
        className="mt-px size-[14px] flex-none text-negative"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[1.3] font-semibold">
          {STREAM_FAILED}
        </p>
        <p className="mt-[7px] text-[12px] leading-[1.6] text-pretty text-ink-2">
          {error.message}
          {error.resetAt === null ? null : (
            <>
              {" "}
              {RATE_LIMITED_UNTIL} {formatDateTimeStamp(error.resetAt)}.
            </>
          )}
        </p>
      </div>
      {error.retryable ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "flex-none text-[11.5px] leading-none font-semibold whitespace-nowrap text-brand",
            focusRing.chip
          )}
        >
          {RETRY}
        </button>
      ) : null}
    </div>
  )
}
