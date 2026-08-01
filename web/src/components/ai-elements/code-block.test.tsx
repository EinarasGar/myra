import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CodeBlock } from "./code-block"

const SOURCE = 'const total = 156452.75 // "net worth"'

function tokens(): HTMLElement[] {
  return [...document.querySelectorAll("pre code span span")].filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  )
}

describe("CodeBlock", () => {
  it("shows the source unhighlighted while the fence is still streaming", () => {
    render(<CodeBlock code="const total = 1" language="ts" incomplete />)

    expect(screen.getByText("const total = 1")).toBeInTheDocument()
    expect(tokens()).toHaveLength(0)
  })

  it("colours each token from the shiki theme in both colour schemes", async () => {
    render(<CodeBlock code={SOURCE} language="ts" />)

    await waitFor(
      () => {
        expect(tokens().length).toBeGreaterThan(3)
      },
      { timeout: 8000 }
    )

    const coloured = tokens().filter(
      (token) => token.style.getPropertyValue("--sd-fg") !== ""
    )
    expect(coloured.length).toBeGreaterThan(3)
    expect(
      coloured.every(
        (token) => token.style.getPropertyValue("--sd-fg-dark") !== ""
      )
    ).toBe(true)
    expect(coloured[0]).toHaveClass("text-[var(--sd-fg,inherit)]")
    expect(document.querySelector("pre")).toHaveTextContent("const total")
  }, 10000)

  it("falls back to plain text for a language shiki does not know", async () => {
    render(<CodeBlock code="net worth: up" language="not-a-language" />)

    expect(screen.getByText("net worth: up")).toBeInTheDocument()
    await waitFor(() => {
      expect(tokens()).toHaveLength(0)
    })
  })
})
