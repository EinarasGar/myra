import { useUserId } from "@/auth"
import type { MockId } from "@/lib/mock"
import { useReviewItems } from "@/features/transactions/review/api"

export interface ReviewQueue {
  count: number
  /** Null once nothing in the queue is invented; while it is set, every surface showing it must mark it. */
  mockId: MockId | null
  /** True while the ledger has pages the queue has not read, so the count is a floor. */
  isLowerBound: boolean
}

/**
 * Every badge in the shell and the dashboard's "Needs you" strip read this, and the Review
 * screen renders the very same queue, so no two surfaces can answer "what is waiting on me"
 * with different numbers.
 */
export function useReviewQueue(): ReviewQueue {
  const queue = useReviewItems(useUserId())
  return {
    count: queue.isPending ? 0 : queue.view.count,
    mockId: queue.view.mockIds[0] ?? null,
    isLowerBound: queue.view.countIsLowerBound,
  }
}
