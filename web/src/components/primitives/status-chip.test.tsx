import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatusChip, SyncDot } from "./status-chip"
import { STATUS_WORDS, type StatusWord } from "./status"

const EXPECTED_TONES: Record<StatusWord, string> = {
  active: "text-positive",
  pending: "text-attention",
  needsAttention: "text-negative",
  paused: "text-ghost",
  notLinked: "text-ghost",
  unreviewed: "text-ghost",
}

describe("StatusChip", () => {
  it("has exactly six words", () => {
    expect(Object.keys(STATUS_WORDS)).toHaveLength(6)
  })

  it.each(Object.keys(EXPECTED_TONES) as StatusWord[])(
    "renders %s with its mandated label and colour",
    (status) => {
      render(<StatusChip status={status} />)
      const chip = screen.getByText(STATUS_WORDS[status].label)
      expect(chip).toHaveAttribute("data-status", status)
      expect(chip).toHaveClass(EXPECTED_TONES[status])
      expect(chip).toHaveClass("border-border-strong", "rounded-chip")
    }
  )

  it("shrinks its padding inside a table row", () => {
    render(<StatusChip status="unreviewed" size="row" />)
    expect(screen.getByText("Unreviewed")).toHaveClass("px-[5px]", "py-[3px]")
  })
})

describe("SyncDot", () => {
  it("prints the status word beside the dot rather than relying on colour", () => {
    render(<SyncDot status="needsAttention" />)
    expect(screen.getByText("Needs attention")).toHaveClass("text-negative")
  })
})
