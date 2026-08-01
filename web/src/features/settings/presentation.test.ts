import { describe, expect, it } from "vitest"

import {
  boundCountLabel,
  consentLabel,
  elapsedLabel,
  resetLabel,
  syncedLabel,
} from "./presentation"

const NOW = Date.UTC(2026, 6, 31, 12, 0, 0)
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe("resetLabel", () => {
  it("refuses to guess when the server sent no stamp", () => {
    expect(resetLabel(null, NOW)).toBe("reset time unknown")
  })

  it("counts down in minutes inside the hour", () => {
    expect(resetLabel(NOW + 24 * MINUTE, NOW)).toBe("resets in 24 minutes")
    expect(resetLabel(NOW + MINUTE, NOW)).toBe("resets in 1 minute")
  })

  it("never rounds a live window down to zero minutes", () => {
    expect(resetLabel(NOW + 1_000, NOW)).toBe("resets in 1 minute")
  })

  it("switches to hours, then to a date", () => {
    expect(resetLabel(NOW + 3 * HOUR, NOW)).toBe("resets in 3 hours")
    expect(resetLabel(NOW + 2 * DAY, NOW)).toContain("resets ")
    expect(resetLabel(NOW + 2 * DAY, NOW)).not.toContain("in ")
  })

  it("says so when the window is already over", () => {
    expect(resetLabel(NOW - MINUTE, NOW)).toBe("resetting now")
  })
})

describe("elapsedLabel and syncedLabel", () => {
  it("has no answer for a binding that has never run", () => {
    expect(elapsedLabel(null, NOW)).toBeNull()
    expect(syncedLabel(null, NOW)).toBe("never synced")
  })

  it("reads back the last run", () => {
    expect(syncedLabel(NOW - 14 * MINUTE, NOW)).toBe("synced 14 minutes ago")
    expect(syncedLabel(NOW - 2 * HOUR, NOW)).toBe("synced 2 hours ago")
    expect(syncedLabel(NOW - 30_000, NOW)).toBe("synced just now")
  })
})

describe("consentLabel", () => {
  it("says there is no expiry rather than inventing one", () => {
    expect(consentLabel(null, NOW)).toBe("no expiry recorded")
  })

  it("warns inside the fortnight and states the date", () => {
    const label = consentLabel(NOW + 3 * DAY, NOW)
    expect(label).toContain("expires")
    expect(label).toContain("3 days left")
  })

  it("says expired in the past tense", () => {
    expect(consentLabel(NOW - DAY, NOW)).toContain("expired")
  })

  it("stays quiet when the consent is far off", () => {
    expect(consentLabel(NOW + 120 * DAY, NOW)).not.toContain("left")
  })
})

describe("boundCountLabel", () => {
  it("omits a denominator it does not have", () => {
    expect(boundCountLabel(2, null)).toBe("2 accounts bound")
    expect(boundCountLabel(1, null)).toBe("1 account bound")
  })

  it("prints the denominator when the provider gave one", () => {
    expect(boundCountLabel(2, 3)).toBe("2 of 3 accounts bound")
  })
})
