import type { NormalizedError } from "@/lib/errors"
import {
  formatDateStamp,
  formatDateTimeStamp,
  formatTimeStamp,
  toDate,
  type DateStampOptions,
} from "@/lib/format"

export function retryAfterCopy(
  error: NormalizedError,
  options: DateStampOptions = {}
): string | undefined {
  if (error.kind !== "rateLimited") return undefined
  if (typeof error.retryAfterSeconds === "number") {
    const seconds = Math.max(1, Math.round(error.retryAfterSeconds))
    if (seconds < 60) return `Try again in ${seconds}s.`
    return `Try again in ${Math.ceil(seconds / 60)} min.`
  }
  const resetAt = toDate(error.resetAt)
  if (!resetAt) return undefined
  const now = options.now ?? new Date()
  const stamp: DateStampOptions = { ...options, now }
  const sameDay =
    formatDateStamp(resetAt, { ...stamp, year: "always" }) ===
    formatDateStamp(now, { ...stamp, year: "always" })
  if (sameDay) return `Resets at ${formatTimeStamp(resetAt, options)}.`
  return `Resets at ${formatDateTimeStamp(resetAt, stamp)}.`
}
