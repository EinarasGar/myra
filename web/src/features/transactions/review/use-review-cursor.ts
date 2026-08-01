import { useCallback, useState } from "react"

import type { ReviewItem } from "./api"

export interface ReviewCursor {
  readonly item: ReviewItem | null
  readonly index: number
  readonly position: number
  readonly total: number
  readonly upNext: readonly ReviewItem[]
  readonly isDone: boolean
  readonly canGoBack: boolean
  readonly next: () => void
  readonly previous: () => void
  readonly restart: () => void
}

interface Anchor {
  readonly id: string
  readonly index: number
}

/**
 * Skipping walks forward; confirming removes the item under the cursor, and the slot it
 * leaves behind is filled by the next one — so an id that vanished resolves to its
 * successor instead of throwing the reviewer back to the top of the queue.
 */
export function useReviewCursor(items: readonly ReviewItem[]): ReviewCursor {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [passComplete, setPassComplete] = useState(false)

  const found =
    anchor === null ? -1 : items.findIndex((item) => item.id === anchor.id)
  const index =
    items.length === 0
      ? -1
      : anchor === null
        ? 0
        : found >= 0
          ? found
          : Math.max(Math.min(anchor.index, items.length - 1), 0)
  const isDone = items.length === 0 || passComplete
  const item = isDone || index < 0 ? null : (items[index] ?? null)

  const move = useCallback(
    (delta: number) => {
      if (index < 0) return
      const target = index + delta
      if (target < 0) return
      if (target >= items.length) {
        setPassComplete(true)
        return
      }
      const nextItem = items[target]
      if (nextItem !== undefined) {
        setAnchor({ id: nextItem.id, index: target })
      }
    },
    [index, items]
  )

  const next = useCallback(() => {
    move(1)
  }, [move])

  const previous = useCallback(() => {
    move(-1)
  }, [move])

  const restart = useCallback(() => {
    setPassComplete(false)
    const first = items[0]
    setAnchor(first === undefined ? null : { id: first.id, index: 0 })
  }, [items])

  return {
    item,
    index,
    position: index + 1,
    total: items.length,
    upNext: isDone || index < 0 ? [] : items.slice(index + 1),
    isDone,
    canGoBack: !isDone && index > 0,
    next,
    previous,
    restart,
  }
}
