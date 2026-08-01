import { useEffect, useRef } from "react"

const SENTINEL_ROOT_MARGIN = "600px"

/**
 * `enabled` must go false while a page is in flight: an observer that stays connected reports
 * nothing new when the sentinel is already on screen, so re-arming it after each fetch is what
 * chains the next page when one page does not fill the viewport.
 */
export function useLoadMoreSentinel<T extends HTMLElement>({
  enabled,
  onLoadMore,
  rootMargin = SENTINEL_ROOT_MARGIN,
}: {
  enabled: boolean
  onLoadMore: () => void
  rootMargin?: string
}) {
  const sentinel = useRef<T | null>(null)
  const latest = useRef(onLoadMore)

  useEffect(() => {
    latest.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    const node = sentinel.current
    if (node === null || !enabled) return
    if (typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) latest.current()
      },
      { rootMargin }
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [enabled, rootMargin])

  return sentinel
}
