import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EmptyState } from "./empty-state"
import { LoadingState, SkeletonRows } from "./loading-state"
import {
  ConfirmState,
  DegradedState,
  ErrorState,
  OfflineState,
  WaitingState,
} from "./message-state"

describe("LoadingState", () => {
  it("announces itself and draws static skeletons", () => {
    const { container } = render(
      <LoadingState footnote="Skeletons mirror the real layout.">
        <SkeletonRows count={3} />
      </LoadingState>
    )

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(3)
    for (const bar of container.querySelectorAll("[data-slot=skeleton]")) {
      expect(bar.className).not.toMatch(/animate-pulse/)
    }
    expect(
      screen.getByText("Skeletons mirror the real layout.")
    ).toBeInTheDocument()
  })
})

describe("EmptyState", () => {
  it("says why it is empty and offers an escape", async () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        headline="Nothing matches those filters"
        body="No sell-asset transactions in Marcus Savings for Q1."
        actions={[{ label: "Clear filters", kind: "primary", onClick }]}
      />
    )

    expect(
      screen.getByText("Nothing matches those filters")
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe("message states", () => {
  it("marks an error as an alert in the negative colour", () => {
    render(
      <ErrorState
        headline="Starling stopped responding"
        body="Your ledger is unaffected."
        detail="truelayer: consent_expired"
      />
    )

    const alert = screen.getByRole("alert")
    expect(alert).toHaveAttribute("data-state", "error")
    expect(screen.getByText("△")).toHaveClass("text-negative")
    expect(screen.getByText("truelayer: consent_expired")).toHaveClass(
      "font-mono"
    )
  })

  it("keeps degraded, waiting and offline on attention and off the alert role", () => {
    const { rerender } = render(<DegradedState headline="Prices are stale" />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByText("◷")).toHaveClass("text-attention")

    rerender(<WaitingState headline="This hour's allowance is used up" />)
    expect(screen.getByText("◷")).toHaveClass("text-attention")

    rerender(<OfflineState headline="Can't reach sverto.home.arpa" />)
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "offline")
  })

  it("treats a confirmation as neutral, not as an error", () => {
    render(
      <ConfirmState
        headline="Revoke access to Lloyds Bank?"
        body="Imports stop immediately."
        actions={[
          { label: "Revoke access", kind: "danger" },
          { label: "Cancel" },
        ]}
      />
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByText("△")).not.toBeInTheDocument()
    expect(screen.getByText("✓")).toHaveClass("text-ink-2")
    expect(screen.getByRole("button", { name: "Revoke access" })).toHaveClass(
      "border-negative",
      "text-negative"
    )
  })
})
