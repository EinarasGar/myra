import { formatDateStamp } from "@/lib/format"

import type { LedgerDay, LedgerRow, NativeAmount } from "../api"
import { groupRowsByDay, sumByAsset } from "../api"

import { rowTransactionCount } from "./pivot"

export interface LoadedSlice {
  readonly transactionCount: number
  readonly netByCurrency: readonly NativeAmount[]
  readonly earliest: Date
  readonly latest: Date
  readonly excludesPartialDay: boolean
}

function withoutOldestDay(days: readonly LedgerDay[]): LedgerDay[] {
  const oldest = days.reduce((earliest, day) =>
    day.date < earliest.date ? day : earliest
  )
  return days.filter((day) => day.key !== oldest.key)
}

/**
 * Built from the day bands the ledger draws, so the bands add up to it exactly. The oldest
 * loaded day is dropped while pages remain, because that day is the one still filling and
 * its own band prints no total either.
 */
export function loadedSlice(
  rows: readonly LedgerRow[],
  hasMore: boolean
): LoadedSlice | null {
  const loaded = groupRowsByDay(rows)
  if (loaded.length === 0) return null

  const days = hasMore ? withoutOldestDay(loaded) : loaded
  const first = days[0]
  if (first === undefined) return null

  let earliest = first.date
  let latest = first.date
  let transactionCount = 0
  for (const day of days) {
    if (day.date < earliest) earliest = day.date
    if (day.date > latest) latest = day.date
    for (const row of day.rows) transactionCount += rowTransactionCount(row)
  }

  return {
    transactionCount,
    netByCurrency: sumByAsset(days.flatMap((day) => day.netByCurrency)),
    earliest,
    latest,
    excludesPartialDay: days.length !== loaded.length,
  }
}

export function sliceRangeLabel(slice: LoadedSlice): string {
  const latest = formatDateStamp(slice.latest, { year: "always" })
  if (slice.earliest.getTime() === slice.latest.getTime()) return latest
  return `${formatDateStamp(slice.earliest)} – ${latest}`
}
