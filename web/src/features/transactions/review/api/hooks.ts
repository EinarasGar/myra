import { useMemo } from "react"

import type { UserId } from "@/lib/query"

import { useLedger } from "../../api"
import { buildReviewQueue } from "./queue"
import { useQuickUploads } from "./quick-uploads"
import type { ReviewQueueView } from "./types"

export const REVIEW_LEDGER_PAGE_SIZE = 50

export interface ReviewQueueResult {
  readonly view: ReviewQueueView
  readonly isPending: boolean
  readonly isError: boolean
  readonly error: unknown
  readonly hasMoreLedger: boolean
  readonly isLoadingMore: boolean
  readonly loadMore: () => void
  readonly refetch: () => void
  readonly ledgerLoadedCount: number
}

export function useReviewItems(userId: UserId): ReviewQueueResult {
  const ledger = useLedger({ userId, limit: REVIEW_LEDGER_PAGE_SIZE })
  const uploads = useQuickUploads(userId)
  const now = useMemo(() => new Date(), [])

  const view = useMemo(
    () =>
      buildReviewQueue({
        rows: ledger.rows,
        uploads: uploads.data ?? [],
        receiptsUnavailable: uploads.isError,
        hasMoreLedger: ledger.hasNextPage,
        includeProposals: ledger.rows.length > 0,
        now,
      }),
    [ledger.rows, ledger.hasNextPage, uploads.data, uploads.isError, now]
  )

  return {
    view,
    isPending: ledger.isPending,
    isError: ledger.isError,
    error: ledger.error,
    hasMoreLedger: ledger.hasNextPage,
    isLoadingMore: ledger.isFetchingNextPage,
    loadMore: ledger.fetchNextPage,
    refetch: () => {
      ledger.refetch()
      void uploads.refetch()
    },
    ledgerLoadedCount: ledger.loadedCount,
  }
}
