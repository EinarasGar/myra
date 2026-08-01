import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SegmentedControl, type SegmentedOption } from "./segmented-control"

type Mode = "explore" | "review"

const OPTIONS: readonly SegmentedOption<Mode>[] = [
  { value: "explore", label: "Explore" },
  { value: "review", label: "Review", count: 8, tone: "attention" },
]

function Harness({ onChange }: { onChange?: (next: Mode) => void }) {
  const [mode, setMode] = useState<Mode>("explore")
  return (
    <SegmentedControl
      label="Ledger mode"
      value={mode}
      options={OPTIONS}
      onValueChange={(next) => {
        setMode(next)
        onChange?.(next)
      }}
    />
  )
}

function segments() {
  return screen.getAllByRole("button")
}

function explore() {
  return screen.getByRole("button", { name: "Explore" })
}

function review() {
  return screen.getByRole("button", { name: /Review/ })
}

describe("SegmentedControl", () => {
  it("exposes the selection without relying on colour", () => {
    render(<Harness />)

    expect(screen.getByRole("group", { name: "Ledger mode" })).toBeVisible()
    expect(explore()).toHaveAttribute("aria-pressed", "true")
    expect(review()).toHaveAttribute("aria-pressed", "false")
    expect(review()).toHaveTextContent("8")
  })

  it("marks a count as a floor and lets the caller name it", () => {
    render(
      <SegmentedControl
        label="Ledger mode"
        value="explore"
        onValueChange={() => undefined}
        options={[
          { value: "explore", label: "Explore" },
          {
            value: "review",
            label: "Review",
            count: 8,
            countIsLowerBound: true,
            ariaLabel: "Review, at least 8 items need review",
          },
        ]}
      />
    )

    const tab = screen.getByRole("button", { name: /Review/ })
    expect(tab).toHaveTextContent("8+")
    expect(tab).toHaveAttribute(
      "aria-label",
      "Review, at least 8 items need review"
    )
  })

  it("takes a single tab stop and moves the selection with the arrow keys", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    expect(segments().filter((segment) => segment.tabIndex === 0)).toHaveLength(
      1
    )

    await user.tab()
    expect(explore()).toHaveFocus()

    await user.keyboard("{ArrowRight}")
    expect(review()).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(onChange).toHaveBeenCalledWith("review")
    expect(review()).toHaveAttribute("aria-pressed", "true")
    expect(explore()).toHaveAttribute("aria-pressed", "false")

    await user.tab()
    expect(review()).not.toHaveFocus()
  })

  it("never leaves the control with nothing selected", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(explore())

    expect(onChange).not.toHaveBeenCalled()
    expect(explore()).toHaveAttribute("aria-pressed", "true")
  })

  it("paints the review segment on attention, not on brand", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(review())

    expect(review().className).toContain("aria-pressed:bg-attention-dim")
    expect(review().className).toContain("text-attention")
    expect(review().className).not.toContain("bg-brand")
    expect(review().className).not.toContain("bg-muted")
    expect(explore().className).not.toContain("bg-muted")
  })
})
