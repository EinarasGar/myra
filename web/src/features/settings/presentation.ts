import { formatDateStamp } from "@/lib/format"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

export function resetLabel(
  resetAt: number | null,
  now: number = Date.now()
): string {
  if (resetAt === null) return "reset time unknown"
  const remaining = resetAt - now
  if (remaining <= 0) return "resetting now"
  if (remaining < HOUR) {
    return `resets in ${plural(Math.max(1, Math.round(remaining / MINUTE)), "minute")}`
  }
  if (remaining < DAY) {
    return `resets in ${plural(Math.round(remaining / HOUR), "hour")}`
  }
  return `resets ${formatDateStamp(resetAt, { now: new Date(now) })}`
}

export function elapsedLabel(
  stamp: number | null,
  now: number = Date.now()
): string | null {
  if (stamp === null) return null
  const elapsed = now - stamp
  if (elapsed < MINUTE) return "just now"
  if (elapsed < HOUR) {
    return `${plural(Math.round(elapsed / MINUTE), "minute")} ago`
  }
  if (elapsed < DAY) return `${plural(Math.round(elapsed / HOUR), "hour")} ago`
  return formatDateStamp(stamp, { now: new Date(now) })
}

export function syncedLabel(
  stamp: number | null,
  now: number = Date.now()
): string {
  const elapsed = elapsedLabel(stamp, now)
  return elapsed === null ? "never synced" : `synced ${elapsed}`
}

export function consentLabel(
  expiresAt: number | null,
  now: number = Date.now()
): string {
  if (expiresAt === null) return "no expiry recorded"
  const remaining = expiresAt - now
  const stamp = formatDateStamp(expiresAt, {
    now: new Date(now),
    year: "always",
  })
  if (remaining <= 0) return `expired ${stamp}`
  if (remaining < 14 * DAY) {
    return `expires ${stamp} — ${plural(Math.max(1, Math.round(remaining / DAY)), "day")} left`
  }
  return `expires ${stamp}`
}

export function boundCountLabel(bound: number, total: number | null): string {
  if (total === null) return `${plural(bound, "account")} bound`
  return `${bound} of ${plural(total, "account")} bound`
}
