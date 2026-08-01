import { describe, expect, it } from "vitest"

import { greetingFor, timeOfDayGreeting } from "./greeting"

function at(hour: number): Date {
  return new Date(2026, 6, 30, hour, 0, 0)
}

describe("timeOfDayGreeting", () => {
  it.each([
    [0, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [17, "Good afternoon"],
    [18, "Good evening"],
    [23, "Good evening"],
  ])("greets %s o'clock with %s", (hour, expected) => {
    expect(timeOfDayGreeting(at(hour))).toBe(expected)
  })
})

describe("greetingFor", () => {
  it("uses the first name only", () => {
    expect(greetingFor("Alex Fletcher", at(19))).toBe("Good evening, Alex")
  })

  it("greets without a name rather than greeting a blank", () => {
    expect(greetingFor(null, at(9))).toBe("Good morning")
    expect(greetingFor("   ", at(9))).toBe("Good morning")
    expect(greetingFor(undefined, at(9))).toBe("Good morning")
  })
})
