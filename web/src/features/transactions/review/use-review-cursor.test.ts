import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { ReviewItem } from "./api"
import { useReviewCursor } from "./use-review-cursor"

function item(id: string): ReviewItem {
  return { id } as ReviewItem
}

const THREE = [item("a"), item("b"), item("c")]

describe("useReviewCursor", () => {
  it("starts on the first item and lists the rest as up next", () => {
    const { result } = renderHook(() => useReviewCursor(THREE))
    expect(result.current.item?.id).toBe("a")
    expect(result.current.position).toBe(1)
    expect(result.current.total).toBe(3)
    expect(result.current.upNext.map((entry) => entry.id)).toEqual(["b", "c"])
    expect(result.current.canGoBack).toBe(false)
  })

  it("steps forward and back", () => {
    const { result } = renderHook(() => useReviewCursor(THREE))
    act(() => {
      result.current.next()
    })
    expect(result.current.item?.id).toBe("b")
    expect(result.current.canGoBack).toBe(true)
    act(() => {
      result.current.previous()
    })
    expect(result.current.item?.id).toBe("a")
  })

  it("lands on the item that took the confirmed one's place", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: readonly ReviewItem[] }) => useReviewCursor(items),
      { initialProps: { items: THREE as readonly ReviewItem[] } }
    )
    act(() => {
      result.current.next()
    })
    expect(result.current.item?.id).toBe("b")

    rerender({ items: [item("a"), item("c")] })
    expect(result.current.item?.id).toBe("c")
    expect(result.current.position).toBe(2)
  })

  it("holds the last slot when the item removed was the last one", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: readonly ReviewItem[] }) => useReviewCursor(items),
      { initialProps: { items: THREE as readonly ReviewItem[] } }
    )
    act(() => {
      result.current.next()
    })
    act(() => {
      result.current.next()
    })
    expect(result.current.item?.id).toBe("c")

    rerender({ items: [item("a"), item("b")] })
    expect(result.current.item?.id).toBe("b")
  })

  it("ends the pass once the last item is skipped, and restarts", () => {
    const { result } = renderHook(() => useReviewCursor(THREE))
    act(() => {
      result.current.next()
    })
    act(() => {
      result.current.next()
    })
    act(() => {
      result.current.next()
    })
    expect(result.current.isDone).toBe(true)
    expect(result.current.item).toBeNull()
    expect(result.current.upNext).toEqual([])

    act(() => {
      result.current.restart()
    })
    expect(result.current.isDone).toBe(false)
    expect(result.current.item?.id).toBe("a")
  })

  it("is done when there is nothing to review", () => {
    const { result } = renderHook(() => useReviewCursor([]))
    expect(result.current.isDone).toBe(true)
    expect(result.current.item).toBeNull()
    expect(result.current.total).toBe(0)
  })
})
