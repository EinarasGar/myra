import { describe, expect, it } from "vitest"

import { isQuestion } from "./question"

describe("isQuestion", () => {
  it("treats a noun as navigation", () => {
    expect(isQuestion("portfolio")).toBe(false)
    expect(isQuestion("Tesco")).toBe(false)
    expect(isQuestion("account settings")).toBe(false)
  })

  it("treats anything ending in a question mark as a question", () => {
    expect(isQuestion("portfolio?")).toBe(true)
  })

  it("treats a question opener as a question", () => {
    expect(isQuestion("how much did I spend")).toBe(true)
    expect(isQuestion("Why is my net worth down")).toBe(true)
    expect(isQuestion("what changed")).toBe(true)
  })

  it("treats a full sentence as a question", () => {
    expect(isQuestion("spending on groceries versus last June")).toBe(true)
  })

  it("is false for an empty query", () => {
    expect(isQuestion("")).toBe(false)
    expect(isQuestion("   ")).toBe(false)
  })
})
