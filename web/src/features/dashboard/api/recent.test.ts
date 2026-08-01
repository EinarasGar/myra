import { describe, expect, it } from "vitest"

import type { LedgerDay } from "@/features/transactions/api"

import { takeRecentDays } from "./recent"

function day(key: string, rowCount: number): LedgerDay {
  return {
    key,
    date: new Date(`2026-07-${key}T00:00:00Z`),
    rows: Array.from({ length: rowCount }, (_, index) => ({
      rowId: `${key}-${index}`,
    })) as unknown as LedgerDay["rows"],
    netByCurrency: [],
  }
}

const DAYS = [day("30", 4), day("29", 3), day("28", 5)]

describe("takeRecentDays", () => {
  it("never draws more rows than the limit allows", () => {
    for (const limit of [0, 1, 3, 4, 5, 7, 12, 99]) {
      const { days, shownCount } = takeRecentDays(DAYS, limit)
      const drawn = days.reduce((sum, taken) => sum + taken.rows.length, 0)
      expect(drawn).toBeLessThanOrEqual(limit)
      expect(shownCount).toBe(drawn)
    }
  })

  it("never emits a day band with no rows under it", () => {
    for (const limit of [0, 1, 4, 5, 8, 20]) {
      const { days } = takeRecentDays(DAYS, limit)
      expect(days.every((taken) => taken.rows.length > 0)).toBe(true)
    }
  })

  it("keeps the ledger's own order and truncates the last day it reaches", () => {
    const { days } = takeRecentDays(DAYS, 6)
    expect(days.map((taken) => taken.key)).toEqual(["30", "29"])
    expect(days.map((taken) => taken.rows.length)).toEqual([4, 2])
  })

  it("passes everything through when the limit exceeds the ledger", () => {
    const { days, shownCount, hiddenCount } = takeRecentDays(DAYS, 99)
    expect(days).toHaveLength(3)
    expect(shownCount).toBe(12)
    expect(hiddenCount).toBe(0)
  })

  it("has nothing to take from an empty ledger", () => {
    expect(takeRecentDays([], 8)).toEqual({
      days: [],
      shownCount: 0,
      hiddenCount: 0,
    })
  })

  it("counts every row it left behind, in drawn days and dropped ones alike", () => {
    for (const limit of [0, 1, 4, 6, 8, 11, 12, 99]) {
      const { shownCount, hiddenCount } = takeRecentDays(DAYS, limit)
      expect(shownCount + hiddenCount).toBe(12)
    }
  })

  it("marks the day it cut so its band cannot claim rows that are not drawn", () => {
    const { days } = takeRecentDays(DAYS, 6)
    expect(days.map((taken) => taken.hiddenCount)).toEqual([0, 1])
  })

  it("leaves a fully drawn day unmarked", () => {
    const { days } = takeRecentDays(DAYS, 4)
    expect(days.map((taken) => taken.hiddenCount)).toEqual([0])
  })
})
