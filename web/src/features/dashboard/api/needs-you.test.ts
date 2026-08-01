import { describe, expect, it } from "vitest"

import type {
  ReviewItem,
  ReviewQueueView,
  ReviewSource,
} from "@/features/transactions/review/api"
import { PROPOSALS_MOCK_ID } from "@/features/transactions/review/api"

import { buildNeedsYou } from "./needs-you"

function item(source: ReviewSource, index: number): ReviewItem {
  return {
    id: `${source}-${String(index)}`,
    source,
    mockId: source === "proposal" ? PROPOSALS_MOCK_ID : null,
  } as ReviewItem
}

function queue(counts: Partial<Record<ReviewSource, number>>): ReviewQueueView {
  const sourceCounts: Record<ReviewSource, number> = {
    import: counts.import ?? 0,
    receipt: counts.receipt ?? 0,
    proposal: counts.proposal ?? 0,
  }
  const items = (Object.keys(sourceCounts) as ReviewSource[]).flatMap(
    (source) =>
      Array.from({ length: sourceCounts[source] }, (_, index) =>
        item(source, index)
      )
  )
  return {
    items,
    count: items.length,
    countIsLowerBound: false,
    sourceCounts,
    summary: "",
    mockIds: sourceCounts.proposal > 0 ? [PROPOSALS_MOCK_ID] : [],
    receiptsUnavailable: false,
    receiptsWorking: 0,
    receiptsFailed: 0,
  }
}

describe("buildNeedsYou", () => {
  it("drops every item whose count is zero", () => {
    const needsYou = buildNeedsYou(queue({ proposal: 2, import: 1 }))
    expect(needsYou.items.map((entry) => entry.key)).toEqual([
      "proposals",
      "imports",
    ])
  })

  it("totals exactly what it lists", () => {
    const needsYou = buildNeedsYou(
      queue({ proposal: 2, import: 1, receipt: 4 })
    )
    expect(needsYou.total).toBe(
      needsYou.items.reduce((sum, entry) => sum + entry.count, 0)
    )
  })

  it("counts exactly what the review queue holds, so the badge cannot differ", () => {
    const view = queue({ proposal: 3, import: 5, receipt: 2 })
    expect(buildNeedsYou(view).total).toBe(view.count)
  })

  it("marks the invented source and leaves the real ones unmarked", () => {
    const needsYou = buildNeedsYou(
      queue({ proposal: 1, import: 2, receipt: 2 })
    )
    const byKey = new Map(needsYou.items.map((entry) => [entry.key, entry]))
    expect(byKey.get("proposals")?.mockId).toBe(PROPOSALS_MOCK_ID)
    expect(byKey.get("imports")?.mockId).toBeNull()
    expect(byKey.get("receipts")?.mockId).toBeNull()
    expect(needsYou.mockId).toBe(PROPOSALS_MOCK_ID)
    expect(needsYou.isMocked).toBe(true)
  })

  it("invents no queue for an account with nothing waiting", () => {
    const needsYou = buildNeedsYou(queue({}))
    expect(needsYou.items).toEqual([])
    expect(needsYou.total).toBe(0)
    expect(needsYou.isMocked).toBe(false)
  })

  it("carries no marker when only real sources are waiting", () => {
    const needsYou = buildNeedsYou(queue({ import: 2, receipt: 3 }))
    expect(needsYou.items.map((entry) => entry.key)).toEqual([
      "imports",
      "receipts",
    ])
    expect(needsYou.mockId).toBeNull()
    expect(needsYou.isMocked).toBe(false)
  })
})
