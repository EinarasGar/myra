import { describe, expect, it } from "vitest"

import { isTypingTarget, reviewKeyAction } from "./use-review-keyboard"

function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, ...init })
}

describe("reviewKeyAction", () => {
  it.each([
    ["Enter", "onConfirm"],
    ["e", "onEdit"],
    ["E", "onEdit"],
    ["ArrowRight", "onSkip"],
    ["Backspace", "onDelete"],
    ["Delete", "onDelete"],
    ["j", "onNext"],
    ["ArrowDown", "onNext"],
    ["k", "onPrevious"],
    ["ArrowUp", "onPrevious"],
  ])("maps %s to %s", (key, action) => {
    expect(reviewKeyAction(press(key))).toBe(action)
  })

  it("ignores keys the queue does not claim", () => {
    expect(reviewKeyAction(press("x"))).toBeNull()
    expect(reviewKeyAction(press("ArrowLeft"))).toBeNull()
  })

  it("leaves modified keys to the browser and the palette", () => {
    expect(reviewKeyAction(press("k", { metaKey: true }))).toBeNull()
    expect(reviewKeyAction(press("Enter", { ctrlKey: true }))).toBeNull()
    expect(reviewKeyAction(press("e", { altKey: true }))).toBeNull()
  })
})

describe("isTypingTarget", () => {
  it.each(["input", "textarea", "select"])("is true inside a %s", (tag) => {
    expect(isTypingTarget(document.createElement(tag))).toBe(true)
  })

  it("is true inside a contenteditable region", () => {
    const node = document.createElement("div")
    node.contentEditable = "true"
    Object.defineProperty(node, "isContentEditable", { value: true })
    expect(isTypingTarget(node)).toBe(true)
  })

  it("is false for a button, a row or nothing at all", () => {
    expect(isTypingTarget(document.createElement("button"))).toBe(false)
    expect(isTypingTarget(document.createElement("tr"))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
