import { describe, expect, it } from "vitest"

import { buildTracker, ONBOARDING_STEPS, stepIndex } from "./steps"

describe("buildTracker", () => {
  it("marks exactly one step as current and everything before it as done", () => {
    const tracker = buildTracker("currency", null)

    expect(tracker.map((step) => step.state)).toEqual(["done", "now", "todo"])
    expect(tracker.filter((step) => step.state === "now")).toHaveLength(1)
  })

  it("ticks a completed step rather than numbering it", () => {
    expect(buildTracker("start", null).map((step) => step.ordinal)).toEqual([
      "✓",
      "✓",
      "3",
    ])
  })

  it("shows the chosen currency once it is saved, and never before", () => {
    expect(buildTracker("currency", "GBP")[1]?.body).toBe(
      "The one everything converts into."
    )
    expect(buildTracker("start", "GBP")[1]?.body).toBe("GBP")
    expect(buildTracker("start", null)[1]?.body).toBe(
      "The one everything converts into."
    )
  })
})

describe("step order", () => {
  it("numbers the steps from one", () => {
    expect(ONBOARDING_STEPS.map(stepIndex)).toEqual([1, 2, 3])
  })
})
