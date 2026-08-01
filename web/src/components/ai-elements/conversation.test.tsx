import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./conversation"

function renderTranscript() {
  return render(
    <Conversation className="max-h-[200px]">
      <ConversationContent aria-label="Conversation with Myra">
        <p>first turn</p>
        <p>last turn</p>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

function scrollRegion(): HTMLElement {
  const region = screen.getByRole("log").firstElementChild
  if (!(region instanceof HTMLElement)) throw new Error("no scroll region")
  return region
}

function stubHeights(element: HTMLElement) {
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: 2000,
  })
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: 200,
  })
}

function scrollTo(element: HTMLElement, top: number) {
  element.scrollTop = top
  element.dispatchEvent(new Event("scroll"))
}

describe("Conversation", () => {
  it("gives the transcript its own scroll region instead of moving the page", () => {
    renderTranscript()

    const region = scrollRegion()
    expect(region.style.height).toBe("100%")
    expect(region).toContainElement(
      screen.getByLabelText("Conversation with Myra")
    )
    expect(screen.getByRole("log")).toHaveClass("max-h-[200px]")
  })

  it("hides the jump control while the reader is already at the bottom", () => {
    renderTranscript()

    expect(
      screen.queryByRole("button", { name: /jump to latest/i })
    ).not.toBeInTheDocument()
  })

  it("offers a jump control once the reader scrolls back up", async () => {
    renderTranscript()
    const region = scrollRegion()
    stubHeights(region)

    scrollTo(region, 600)
    scrollTo(region, 0)

    expect(
      await screen.findByRole("button", { name: /jump to latest/i })
    ).toBeInTheDocument()

    scrollTo(region, 1800)
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /jump to latest/i })
      ).not.toBeInTheDocument()
    })
  })
})
