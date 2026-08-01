import { useMemo } from "react"
import { CircleDashed, Receipt, Sparkle, type LucideIcon } from "lucide-react"

import type { MockId } from "@/lib/mock"
import type { UserId } from "@/lib/query"
import type {
  ReviewQueueView,
  ReviewSource,
} from "@/features/transactions/review/api"
import {
  PROPOSALS_MOCK_ID,
  useReviewItems,
} from "@/features/transactions/review/api"

export type NeedsYouKey = "proposals" | "imports" | "receipts"

export interface NeedsYouItem {
  key: NeedsYouKey
  icon: LucideIcon
  count: number
  label: string
  /** Counted over the ledger pages read so far, so more may be waiting further back. */
  isLowerBound: boolean
  mockId: MockId | null
}

export interface NeedsYou {
  items: NeedsYouItem[]
  total: number
  /** The queue read only part of the ledger, so every count here is a floor. */
  isLowerBound: boolean
  isMocked: boolean
  mockId: MockId | null
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

const SOURCE_OF: Record<NeedsYouKey, ReviewSource> = {
  proposals: "proposal",
  imports: "import",
  receipts: "receipt",
}

/**
 * Built from the queue the Review screen renders, so the strip, the rail badge and the
 * Review tab are three views of one list rather than three counts of one idea.
 */
export function buildNeedsYou(queue: ReviewQueueView): NeedsYou {
  const counts = queue.sourceCounts
  const mocked = new Set(
    queue.items
      .filter((item) => item.mockId !== null)
      .map((item) => item.source)
  )

  const candidates: NeedsYouItem[] = (
    [
      {
        key: "proposals",
        icon: Sparkle,
        count: counts.proposal,
        label: plural(counts.proposal, "Myra proposal", "Myra proposals"),
        isLowerBound: false,
        mockId: PROPOSALS_MOCK_ID,
      },
      {
        key: "imports",
        icon: CircleDashed,
        count: counts.import,
        label: plural(counts.import, "unreviewed import", "unreviewed imports"),
        isLowerBound: queue.countIsLowerBound,
        mockId: null,
      },
      {
        key: "receipts",
        icon: Receipt,
        count: counts.receipt,
        label: plural(counts.receipt, "receipt ready", "receipts ready"),
        isLowerBound: false,
        mockId: null,
      },
    ] satisfies NeedsYouItem[]
  ).map((item) =>
    mocked.has(SOURCE_OF[item.key]) ? item : { ...item, mockId: null }
  )

  const items = candidates.filter((item) => item.count > 0)
  const mockId = items.find((item) => item.mockId !== null)?.mockId ?? null
  return {
    items,
    total: items.reduce((sum, item) => sum + item.count, 0),
    isLowerBound: queue.countIsLowerBound,
    isMocked: mockId !== null,
    mockId,
  }
}

export function useNeedsYou(userId: UserId): NeedsYou {
  const queue = useReviewItems(userId)
  const view = queue.view
  return useMemo(() => buildNeedsYou(view), [view])
}
