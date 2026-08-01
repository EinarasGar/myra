import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  shellWidthFor,
  useHasKeyboardAffordances,
  useShellWidth,
} from "./breakpoints"

type Listener = () => void

function stubViewport(initialWidth: number) {
  let width = initialWidth
  const listeners = new Set<Listener>()

  window.matchMedia = ((query: string) => {
    const minWidth = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    const list = {
      get matches() {
        return width >= minWidth
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: Listener) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        listeners.delete(listener),
      dispatchEvent: () => false,
    }
    return list as unknown as MediaQueryList
  }) as typeof window.matchMedia

  return (next: number) => {
    width = next
    act(() => {
      for (const listener of [...listeners]) listener()
    })
  }
}

describe("shellWidthFor", () => {
  it("maps every viewport to one of the four widths", () => {
    expect(shellWidthFor(390)).toBe("phone")
    expect(shellWidthFor(767)).toBe("phone")
    expect(shellWidthFor(768)).toBe("stacked")
    expect(shellWidthFor(1023)).toBe("stacked")
    expect(shellWidthFor(1024)).toBe("tight")
    expect(shellWidthFor(1279)).toBe("tight")
    expect(shellWidthFor(1280)).toBe("full")
    expect(shellWidthFor(1900)).toBe("full")
  })
})

describe("useShellWidth", () => {
  it("tracks the viewport across every breakpoint", () => {
    const resize = stubViewport(1440)
    const { result } = renderHook(() => useShellWidth())
    expect(result.current).toBe("full")

    resize(1100)
    expect(result.current).toBe("tight")

    resize(820)
    expect(result.current).toBe("stacked")

    resize(390)
    expect(result.current).toBe("phone")
  })
})

describe("useHasKeyboardAffordances", () => {
  it("is false below 1024 so key badges never lie about a keyboard", () => {
    const resize = stubViewport(1280)
    const { result } = renderHook(() => useHasKeyboardAffordances())
    expect(result.current).toBe(true)

    resize(1024)
    expect(result.current).toBe(true)

    resize(1023)
    expect(result.current).toBe(false)

    resize(390)
    expect(result.current).toBe(false)
  })
})
