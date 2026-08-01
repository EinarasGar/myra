import { describe, expect, it } from "vitest"

import { EM_DASH } from "./chars"
import {
  formatDateStamp,
  formatDateTimeStamp,
  formatDayLabel,
  formatMonthStamp,
  formatTimeStamp,
  toDate,
} from "./datetime"

const NOW = new Date(2026, 6, 30, 9, 12)
const STAMP = new Date(2026, 6, 26, 17, 35)

describe("toDate", () => {
  it("accepts dates, timestamps and ISO strings", () => {
    expect(toDate(STAMP)).toEqual(STAMP)
    expect(toDate(STAMP.getTime())?.getTime()).toBe(STAMP.getTime())
    expect(toDate("2026-07-26T17:35:00Z")?.toISOString()).toBe(
      "2026-07-26T17:35:00.000Z"
    )
  })

  it("rejects anything unparseable", () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
    expect(toDate("not a date")).toBeNull()
    expect(toDate(new Date("nope"))).toBeNull()
  })
})

describe("formatDateStamp", () => {
  it("drops the year inside the current year", () => {
    expect(formatDateStamp(STAMP, { now: NOW })).toBe("26 Jul")
  })

  it("prints the year outside the current year", () => {
    expect(formatDateStamp(STAMP, { now: new Date(2027, 0, 4) })).toBe(
      "26 Jul 2026"
    )
  })

  it("honours an explicit year mode", () => {
    expect(formatDateStamp(STAMP, { now: NOW, year: "always" })).toBe(
      "26 Jul 2026"
    )
    expect(
      formatDateStamp(STAMP, { now: new Date(2027, 0, 4), year: "never" })
    ).toBe("26 Jul")
  })

  it("follows the locale", () => {
    expect(
      formatDateStamp(STAMP, { now: NOW, locale: "de-DE", year: "always" })
    ).toBe("26. Juli 2026")
  })

  it("renders an em dash for a missing date", () => {
    expect(formatDateStamp(null)).toBe(EM_DASH)
    expect(formatDateStamp("not a date")).toBe(EM_DASH)
  })
})

describe("formatTimeStamp", () => {
  it("prints a 24-hour stamp", () => {
    expect(formatTimeStamp(STAMP)).toBe("17:35")
    expect(formatTimeStamp(new Date(2026, 6, 26, 0, 0))).toBe("00:00")
    expect(formatTimeStamp(new Date(2026, 6, 26, 9, 5))).toBe("09:05")
  })

  it("respects an explicit time zone", () => {
    expect(formatTimeStamp("2026-07-26T17:35:00Z", { timeZone: "UTC" })).toBe(
      "17:35"
    )
  })

  it("reads an RFC3339 stamp straight off the wire", () => {
    expect(formatTimeStamp("2026-07-30T22:00:00Z", { timeZone: "UTC" })).toBe(
      "22:00"
    )
    expect(
      formatTimeStamp("2026-07-30T23:00:00+01:00", { timeZone: "UTC" })
    ).toBe("22:00")
    expect(
      formatTimeStamp("2026-07-30T22:00:00.123456Z", { timeZone: "UTC" })
    ).toBe("22:00")
  })

  it("renders an em dash rather than echoing an unusable value", () => {
    expect(formatTimeStamp(undefined)).toBe(EM_DASH)
    expect(formatTimeStamp(null)).toBe(EM_DASH)
    expect(formatTimeStamp("")).toBe(EM_DASH)
    expect(formatTimeStamp("2026-07-30 22:00 sometime")).toBe(EM_DASH)
  })
})

describe("formatDateTimeStamp", () => {
  it("joins the date and time with the meta separator", () => {
    expect(formatDateTimeStamp(STAMP, { now: NOW })).toBe("26 Jul · 17:35")
    expect(formatDateTimeStamp(STAMP, { now: NOW, year: "always" })).toBe(
      "26 Jul 2026 · 17:35"
    )
  })

  it("reads an RFC3339 stamp straight off the wire", () => {
    expect(
      formatDateTimeStamp("2026-07-30T22:00:00Z", {
        now: NOW,
        timeZone: "UTC",
      })
    ).toBe("30 Jul · 22:00")
  })

  it("renders an em dash rather than echoing an unusable value", () => {
    expect(formatDateTimeStamp(null)).toBe(EM_DASH)
    expect(formatDateTimeStamp(undefined)).toBe(EM_DASH)
    expect(formatDateTimeStamp("later")).toBe(EM_DASH)
  })
})

describe("formatMonthStamp", () => {
  it("prints a short month with a two-digit year for axis ticks", () => {
    expect(formatMonthStamp(STAMP)).toBe("Jul 26")
    expect(formatMonthStamp(new Date(2020, 0, 15))).toBe("Jan 20")
  })

  it("renders an em dash for a missing date", () => {
    expect(formatMonthStamp(null)).toBe(EM_DASH)
  })
})

describe("formatDayLabel", () => {
  it("names today and yesterday", () => {
    expect(formatDayLabel(new Date(2026, 6, 30, 8, 0), { now: NOW })).toBe(
      "Today"
    )
    expect(formatDayLabel(new Date(2026, 6, 29, 23, 59), { now: NOW })).toBe(
      "Yesterday"
    )
  })

  it("names the weekday inside the last week", () => {
    expect(formatDayLabel(new Date(2026, 6, 26), { now: NOW })).toBe("Sunday")
  })

  it("falls back to the date stamp beyond a week and in the future", () => {
    expect(formatDayLabel(new Date(2026, 6, 1), { now: NOW })).toBe("1 Jul")
    expect(formatDayLabel(new Date(2026, 7, 8), { now: NOW })).toBe("8 Aug")
  })

  it("renders an em dash for a missing date", () => {
    expect(formatDayLabel(null)).toBe(EM_DASH)
  })
})
