import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { InfiniteLoadFooter } from "./infinite-load"

type Observed = {
  callback: IntersectionObserverCallback
  targets: Element[]
  disconnected: boolean
}

const observers: Observed[] = []

class StubIntersectionObserver {
  private readonly record: Observed

  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, targets: [], disconnected: false }
    observers.push(this.record)
  }

  observe(target: Element) {
    this.record.targets.push(target)
  }

  unobserve() {}

  disconnect() {
    this.record.disconnected = true
  }
}

function intersect(index: number) {
  const observer = observers[index]
  if (observer === undefined) throw new Error("no observer at that index")
  observer.callback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver
  )
}

function live(): Observed[] {
  return observers.filter((observer) => !observer.disconnected)
}

const loadMore = vi.fn()

beforeEach(() => {
  observers.length = 0
  loadMore.mockReset()
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("InfiniteLoadFooter", () => {
  it("loads the next page when the sentinel scrolls into view", () => {
    render(
      <InfiniteLoadFooter
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={loadMore}
        label="Load more rows"
      />
    )

    expect(live()).toHaveLength(1)
    intersect(0)
    expect(loadMore).toHaveBeenCalledTimes(1)
  })

  it("watches the sentinel it rendered", () => {
    render(
      <InfiniteLoadFooter
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={loadMore}
        label="Load more rows"
      />
    )

    const sentinel = document.querySelector('[data-slot="load-more-sentinel"]')
    expect(sentinel).not.toBeNull()
    expect(observers[0]?.targets).toContain(sentinel)
  })

  it("stops watching while a page is in flight and re-arms afterwards", () => {
    const view = render(
      <InfiniteLoadFooter
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={loadMore}
        label="Load more rows"
      />
    )
    expect(live()).toHaveLength(1)

    view.rerender(
      <InfiniteLoadFooter
        hasNextPage
        isFetchingNextPage
        onLoadMore={loadMore}
        label="Load more rows"
      />
    )
    expect(live()).toHaveLength(0)

    view.rerender(
      <InfiniteLoadFooter
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={loadMore}
        label="Load more rows"
      />
    )
    expect(live()).toHaveLength(1)
    intersect(observers.length - 1)
    expect(loadMore).toHaveBeenCalledTimes(1)
  })

  it("keeps a keyboard-reachable control that says what it loads", () => {
    render(
      <InfiniteLoadFooter
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={loadMore}
        label="Load more rows"
        note="25 of 2,542 loaded"
      />
    )

    const button = screen.getByRole("button", { name: /Load more rows/ })
    expect(button.tabIndex).toBe(0)
    expect(button).toHaveClass("min-h-[44px]")
    expect(button.textContent).toContain("25 of 2,542 loaded")

    fireEvent.click(button)
    expect(loadMore).toHaveBeenCalledTimes(1)
  })

  it("reserves the same height for the busy state as for the control", () => {
    render(
      <InfiniteLoadFooter
        hasNextPage
        isFetchingNextPage
        onLoadMore={loadMore}
        label="Load more rows"
      />
    )

    const status = screen.getByRole("status")
    expect(status).toHaveClass("min-h-[44px]")
    expect(status).toHaveTextContent("Loading more…")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("disappears once there is nothing left to load", () => {
    render(
      <InfiniteLoadFooter
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={loadMore}
        label="Load more rows"
      />
    )

    expect(
      document.querySelector('[data-slot="infinite-load-footer"]')
    ).toBeNull()
    expect(live()).toHaveLength(0)
  })
})
