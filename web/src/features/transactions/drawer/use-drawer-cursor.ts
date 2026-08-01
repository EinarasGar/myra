import { useCallback, useEffect, useRef, useState } from "react"

import type { TransactionId } from "@/lib/query"

export type DrawerCursorHistory = "push" | "replace" | "back"

export interface DrawerCursor {
  readonly transactionId: TransactionId | null
  readonly isOpen: boolean
  readonly position: number
  readonly total: number
  /** More pages exist, so `total` is what is loaded rather than the whole set. */
  readonly totalIsLowerBound: boolean
  /** The open transaction was found among the loaded rows, so `position` means something. */
  readonly hasPlace: boolean
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly isLoadingMore: boolean
  readonly open: (transactionId: TransactionId) => void
  readonly close: () => void
  readonly step: (delta: number) => void
}

export interface DrawerCursorPaging {
  readonly hasMore: boolean
  readonly loadMore: () => void
}

export interface DrawerCursorOptions {
  readonly transactionId: TransactionId | null
  readonly onChange: (
    transactionId: TransactionId | null,
    history: DrawerCursorHistory
  ) => void
  readonly paging?: DrawerCursorPaging
}

/**
 * The open transaction lives in the URL so the drawer can be reloaded, shared and closed
 * with Back; only the slot it occupies is local, because a row index is meaningless to
 * anyone the link is sent to.
 *
 * That slot is what lets the cursor survive its row disappearing: after a delete it lands
 * on whatever took the slot rather than closing, and stepping past the last loaded row
 * claims the slot the next page will fill so the page boundary is not a wall.
 *
 * A selection with no slot yet is a link that arrived before its page did — the drawer
 * opens and fetches the transaction on its own rather than being reconciled away.
 */
export function useDrawerCursor(
  transactionIds: readonly TransactionId[],
  { transactionId: selected, onChange, paging }: DrawerCursorOptions
): DrawerCursor {
  const hasMore = paging?.hasMore ?? false
  const [awaited, setAwaited] = useState<number | null>(null)
  const [slot, setSlot] = useState<number | null>(null)
  const requested = useRef<TransactionId | null | undefined>(undefined)

  const found = selected === null ? -1 : transactionIds.indexOf(selected)
  if (found >= 0 && slot !== found) setSlot(found)
  if (selected === null && slot !== null) setSlot(null)

  const arriving = awaited === null ? null : (transactionIds[awaited] ?? null)
  const settled =
    awaited === null || (arriving === null && !hasMore) || arriving === selected
  const arrived = settled ? null : arriving
  const isLoadingMore = !settled && arriving === null

  const vanished = selected !== null && found < 0 && settled && slot !== null
  const vacatedIndex = vanished ? Math.min(slot, transactionIds.length - 1) : -1
  const vacatedId =
    vacatedIndex >= 0 ? (transactionIds[vacatedIndex] ?? null) : null

  const transactionId =
    selected === null
      ? null
      : arrived !== null
        ? arrived
        : vanished
          ? vacatedId
          : selected

  const index =
    transactionId === null
      ? -1
      : arrived !== null && awaited !== null
        ? awaited
        : vanished
          ? vacatedIndex
          : found

  useEffect(() => {
    if (transactionId === selected) {
      requested.current = undefined
      return
    }
    if (requested.current === transactionId) return
    requested.current = transactionId
    onChange(transactionId, "replace")
  }, [transactionId, selected, onChange])

  const step = useCallback(
    (delta: number) => {
      if (index < 0) return
      const next = index + delta
      if (next < 0) return
      if (next >= transactionIds.length) {
        if (delta > 0 && hasMore && settled) {
          setAwaited(next)
          paging?.loadMore()
        }
        return
      }
      const id = transactionIds[next]
      if (id === undefined) return
      setSlot(next)
      onChange(id, "replace")
    },
    [index, transactionIds, hasMore, settled, paging, onChange]
  )

  const open = useCallback(
    (id: TransactionId) => {
      const at = transactionIds.indexOf(id)
      setSlot(at >= 0 ? at : null)
      setAwaited(null)
      onChange(id, "push")
    },
    [transactionIds, onChange]
  )

  const close = useCallback(() => {
    setSlot(null)
    setAwaited(null)
    onChange(null, "back")
  }, [onChange])

  return {
    transactionId,
    isOpen: transactionId !== null,
    position: index + 1,
    total: transactionIds.length,
    totalIsLowerBound: hasMore,
    hasPlace: index >= 0,
    canStepBack: index > 0,
    canStepForward:
      index >= 0 && (index < transactionIds.length - 1 || hasMore),
    isLoadingMore,
    open,
    close,
    step,
  }
}
