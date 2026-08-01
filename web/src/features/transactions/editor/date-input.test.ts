import { describe, expect, it } from "vitest"

import { formatEditorDate, parseEditorDate } from "./date-input"

const NOW = new Date("2026-07-26T14:00:00Z")

describe("the date field's parser", () => {
  it("reads the plain English the frame promises", () => {
    expect(parseEditorDate("today", NOW).label).toBe("26 Jul 2026")
    expect(parseEditorDate("yesterday", NOW).label).toBe("25 Jul 2026")
    expect(parseEditorDate("3 days ago", NOW).label).toBe("23 Jul 2026")
  })

  it("reads a weekday as the most recent one, never today", () => {
    expect(parseEditorDate("sunday", NOW).label).toBe("19 Jul 2026")
    expect(parseEditorDate("last friday", NOW).label).toBe("24 Jul 2026")
  })

  it("reads written and numeric dates", () => {
    expect(parseEditorDate("2026-07-24", NOW).label).toBe("24 Jul 2026")
    expect(parseEditorDate("24/07/2026", NOW).label).toBe("24 Jul 2026")
    expect(parseEditorDate("24 Jul 2026", NOW).label).toBe("24 Jul 2026")
  })

  it("refuses what it cannot read rather than keeping the old date", () => {
    expect(parseEditorDate("last-week-ish", NOW)).toEqual({
      date: null,
      label: null,
    })
    expect(parseEditorDate("", NOW)).toEqual({ date: null, label: null })
  })

  it("round-trips through the display format", () => {
    const parsed = parseEditorDate("2026-07-24", NOW)
    expect(parsed.date).not.toBeNull()
    expect(formatEditorDate(parsed.date ?? 0)).toBe("24 Jul 2026")
  })

  it("resolves to the start of the day, in whole seconds", () => {
    const parsed = parseEditorDate("today", NOW)
    expect(parsed.date).not.toBeNull()
    expect(Number.isInteger(parsed.date)).toBe(true)
    expect(formatEditorDate(parsed.date ?? 0)).toBe("26 Jul 2026")
  })
})
