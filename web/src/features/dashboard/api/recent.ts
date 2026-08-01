import type { LedgerDay } from "@/features/transactions/api"

export interface RecentDay extends LedgerDay {
  hiddenCount: number
}

export interface RecentLedger {
  days: RecentDay[]
  shownCount: number
  hiddenCount: number
}

export function takeRecentDays(
  days: readonly LedgerDay[],
  limit: number
): RecentLedger {
  const taken: RecentDay[] = []
  let shownCount = 0
  let hiddenCount = 0

  for (const day of days) {
    const rows = day.rows.slice(0, Math.max(limit - shownCount, 0))
    const hidden = day.rows.length - rows.length
    hiddenCount += hidden
    if (rows.length === 0) continue
    taken.push({ ...day, rows, hiddenCount: hidden })
    shownCount += rows.length
  }

  return { days: taken, shownCount, hiddenCount }
}
