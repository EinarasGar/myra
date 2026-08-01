import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { toast, Toaster } from "./toast"

function renderToaster() {
  return render(<Toaster />)
}

function icon(): HTMLElement | null {
  return document.querySelector('[data-slot="toast-icon"]')
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  act(() => {
    toast.close()
  })
  vi.useRealTimers()
})

describe("the designed toast", () => {
  it("carries the semantic glyph, not a stock icon", () => {
    renderToaster()
    act(() => {
      toast.add({ type: "success", title: "Marked reviewed" })
    })

    expect(icon()?.textContent).toBe("✓")
    expect(icon()?.className).toContain("text-positive")
    expect(icon()?.className).toContain("font-mono")
    expect(document.querySelector("svg")).toBeNull()
  })

  it("sits on surface-2 behind a strong border at the control radius", () => {
    renderToaster()
    act(() => {
      toast.add({ type: "info", title: "Back in the queue" })
    })

    const root = document.querySelector('[data-slot="toast"]')
    expect(root?.className).toContain("bg-surface-2")
    expect(root?.className).toContain("border-border-strong")
    expect(root?.className).toContain("rounded-md")
  })

  it("moves on the system's sheet duration and its one easing", () => {
    renderToaster()
    act(() => {
      toast.add({ type: "success", title: "Created" })
    })

    const root = document.querySelector('[data-slot="toast"]')
    expect(root?.className).toContain("var(--duration-sheet)")
    expect(root?.className).toContain("var(--ease-out-quick)")
    expect(root?.className).not.toContain("cubic-bezier")
  })

  it("puts Undo in brand on a reversible write", () => {
    renderToaster()
    act(() => {
      toast.add({
        type: "success",
        title: "Deleted",
        actionProps: { children: "Undo", onClick: () => {} },
      })
    })

    const action = screen.getByRole("button", { name: "Undo" })
    expect(action.className).toContain("text-brand")
    expect(action.className).toContain("font-semibold")
  })

  it("dismisses a confirmation on its own", () => {
    renderToaster()
    act(() => {
      toast.add({ type: "success", timeout: 6000, title: "Marked reviewed" })
    })
    expect(screen.getByText("Marked reviewed")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(9000)
    })
    expect(screen.queryByText("Marked reviewed")).toBeNull()
  })

  it("never auto-dismisses a failure, whatever timeout the caller asked for", () => {
    renderToaster()
    act(() => {
      toast.add({ type: "error", timeout: 1000, title: "That didn't save" })
    })

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText("That didn't save")).toBeInTheDocument()
    expect(icon()?.textContent).toBe("△")
    expect(icon()?.className).toContain("text-negative")
  })
})
