import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type {
  DrawerCursor,
  DrawerCursorHistory,
  DrawerCursorPaging,
} from "./use-drawer-cursor"
import { useDrawerCursor } from "./use-drawer-cursor"

const IDS = ["a", "b", "c"]

interface Harness {
  readonly ids: readonly string[]
  readonly paging?: DrawerCursorPaging
}

interface Write {
  readonly id: string | null
  readonly history: DrawerCursorHistory
}

/**
 * Stands in for the route: the selected id lives outside the hook exactly as it lives in
 * the URL, and every write records how it asked to be recorded in history.
 */
function renderCursor(initial: Harness = { ids: IDS }) {
  const writes: Write[] = []
  let selected: string | null = null

  const rendered = renderHook(
    ({ ids, paging }: Harness) =>
      useDrawerCursor(ids, {
        transactionId: selected,
        onChange: (transactionId, history) => {
          writes.push({ id: transactionId, history })
          selected = transactionId
        },
        ...(paging === undefined ? {} : { paging }),
      }),
    { initialProps: initial }
  )

  let current = initial

  const settle = (next?: Harness) => {
    current = next ?? current
    act(() => {
      rendered.rerender(current)
    })
    act(() => {
      rendered.rerender(current)
    })
    act(() => {
      rendered.rerender(current)
    })
  }

  return {
    writes,
    url: () => selected,
    cursor: (): DrawerCursor => rendered.result.current,
    run: (drive: (cursor: DrawerCursor) => void) => {
      act(() => {
        drive(rendered.result.current)
      })
      settle()
    },
    settle,
  }
}

describe("useDrawerCursor", () => {
  it("stays closed until a row is opened", () => {
    const harness = renderCursor()
    expect(harness.cursor().isOpen).toBe(false)
    expect(harness.cursor().transactionId).toBeNull()
    expect(harness.cursor().total).toBe(3)
  })

  it("writes the opened transaction out, pushing history so Back closes it", () => {
    const harness = renderCursor()
    harness.run((cursor) => {
      cursor.open("b")
    })
    expect(harness.writes).toEqual([{ id: "b", history: "push" }])
    expect(harness.url()).toBe("b")
    expect(harness.cursor().transactionId).toBe("b")
    expect(harness.cursor().isOpen).toBe(true)
  })

  it("opens straight from a selection it has never seen in the list", () => {
    const writes: Write[] = []
    const { result } = renderHook(() =>
      useDrawerCursor([], {
        transactionId: "deep-linked",
        onChange: (id, history) => {
          writes.push({ id, history })
        },
      })
    )
    expect(result.current.isOpen).toBe(true)
    expect(result.current.transactionId).toBe("deep-linked")
    expect(result.current.hasPlace).toBe(false)
    expect(writes).toEqual([])
  })

  it("reports its place in the list and where it can step", () => {
    const harness = renderCursor()
    harness.run((cursor) => {
      cursor.open("b")
    })
    expect(harness.cursor().position).toBe(2)
    expect(harness.cursor().hasPlace).toBe(true)
    expect(harness.cursor().canStepBack).toBe(true)
    expect(harness.cursor().canStepForward).toBe(true)

    harness.run((cursor) => {
      cursor.step(1)
    })
    expect(harness.cursor().transactionId).toBe("c")
    expect(harness.cursor().canStepForward).toBe(false)
  })

  it("steps without pushing, so Back still closes rather than rewinds", () => {
    const harness = renderCursor()
    harness.run((cursor) => {
      cursor.open("a")
    })
    harness.run((cursor) => {
      cursor.step(1)
    })
    harness.run((cursor) => {
      cursor.step(1)
    })
    expect(harness.writes).toEqual([
      { id: "a", history: "push" },
      { id: "b", history: "replace" },
      { id: "c", history: "replace" },
    ])
  })

  it("refuses to step off either end", () => {
    const harness = renderCursor()
    harness.run((cursor) => {
      cursor.open("a")
    })
    harness.run((cursor) => {
      cursor.step(-1)
    })
    expect(harness.cursor().transactionId).toBe("a")
  })

  it("lands on the row that replaced a deleted one", () => {
    const harness = renderCursor()
    harness.run((cursor) => {
      cursor.open("b")
    })
    harness.settle({ ids: ["a", "c"] })
    expect(harness.cursor().transactionId).toBe("c")
    expect(harness.url()).toBe("c")
    expect(harness.cursor().isOpen).toBe(true)
  })

  it("closes when the list empties out from under it", () => {
    const harness = renderCursor()
    harness.run((cursor) => {
      cursor.open("a")
    })
    harness.settle({ ids: [] })
    expect(harness.cursor().isOpen).toBe(false)
    expect(harness.url()).toBeNull()
  })

  it("marks the denominator as a floor while pages are still unread", () => {
    const withMore = renderCursor({
      ids: IDS,
      paging: { hasMore: true, loadMore: vi.fn() },
    })
    expect(withMore.cursor().total).toBe(3)
    expect(withMore.cursor().totalIsLowerBound).toBe(true)

    const complete = renderCursor({
      ids: IDS,
      paging: { hasMore: false, loadMore: vi.fn() },
    })
    expect(complete.cursor().totalIsLowerBound).toBe(false)
  })

  it("asks for the next page instead of dead-ending on the last loaded row", () => {
    const loadMore = vi.fn()
    const harness = renderCursor({
      ids: IDS,
      paging: { hasMore: true, loadMore },
    })
    harness.run((cursor) => {
      cursor.open("c")
    })
    expect(harness.cursor().canStepForward).toBe(true)

    harness.run((cursor) => {
      cursor.step(1)
    })
    expect(loadMore).toHaveBeenCalledTimes(1)
    expect(harness.cursor().transactionId).toBe("c")
    expect(harness.cursor().isLoadingMore).toBe(true)

    harness.settle({
      ids: ["a", "b", "c", "d"],
      paging: { hasMore: false, loadMore },
    })
    expect(harness.cursor().transactionId).toBe("d")
    expect(harness.url()).toBe("d")
    expect(harness.cursor().position).toBe(4)
    expect(harness.cursor().isLoadingMore).toBe(false)
    expect(harness.cursor().canStepForward).toBe(false)
  })

  it("stops waiting when the page it asked for brings nothing back", () => {
    const loadMore = vi.fn()
    const harness = renderCursor({
      ids: IDS,
      paging: { hasMore: true, loadMore },
    })
    harness.run((cursor) => {
      cursor.open("c")
    })
    harness.run((cursor) => {
      cursor.step(1)
    })
    harness.settle({ ids: IDS, paging: { hasMore: false, loadMore } })
    expect(harness.cursor().isLoadingMore).toBe(false)
    expect(harness.cursor().transactionId).toBe("c")
    expect(harness.cursor().canStepForward).toBe(false)
  })

  it("asks to go back rather than forward when closed", () => {
    const harness = renderCursor()
    harness.run((cursor) => {
      cursor.open("a")
    })
    harness.run((cursor) => {
      cursor.close()
    })
    expect(harness.writes.at(-1)).toEqual({ id: null, history: "back" })
    expect(harness.cursor().isOpen).toBe(false)
  })
})
