import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type {
  ReviewItem,
  ReviewQueueView,
  ReviewSource,
} from "@/features/transactions/review/api"
import { PROPOSALS_MOCK_ID } from "@/features/transactions/review/api"

import { buildNeedsYou } from "../api"
import { renderInRouter } from "../test-router"
import { NeedsYouStrip } from "./needs-you-strip"

function queue(
  counts: Partial<Record<ReviewSource, number>>,
  countIsLowerBound = false
): ReviewQueueView {
  const sourceCounts: Record<ReviewSource, number> = {
    import: counts.import ?? 0,
    receipt: counts.receipt ?? 0,
    proposal: counts.proposal ?? 0,
  }
  const items = (Object.keys(sourceCounts) as ReviewSource[]).flatMap(
    (source) =>
      Array.from(
        { length: sourceCounts[source] },
        (_, index) =>
          ({
            id: `${source}-${String(index)}`,
            source,
            mockId: source === "proposal" ? PROPOSALS_MOCK_ID : null,
          }) as ReviewItem
      )
  )
  return {
    items,
    count: items.length,
    countIsLowerBound,
    sourceCounts,
    summary: "",
    mockIds: sourceCounts.proposal > 0 ? [PROPOSALS_MOCK_ID] : [],
    receiptsUnavailable: false,
    receiptsWorking: 0,
    receiptsFailed: 0,
  }
}

function strip(): HTMLElement | null {
  return document.querySelector('[data-slot="needs-you"]')
}

describe("NeedsYouStrip", () => {
  it("disappears entirely when nothing is waiting", async () => {
    await renderInRouter(<NeedsYouStrip needsYou={buildNeedsYou(queue({}))} />)
    expect(strip()).toBeNull()
  })

  it("shows one line per source and a way into the queue", async () => {
    await renderInRouter(
      <NeedsYouStrip
        needsYou={buildNeedsYou(queue({ proposal: 3, import: 3, receipt: 2 }))}
      />
    )
    expect(
      document.querySelectorAll('[data-slot="needs-you-item"]')
    ).toHaveLength(3)
    expect(screen.getByRole("link", { name: /review them/i })).toBeVisible()
  })

  it("marks the strip with the entry that owns the invented count", async () => {
    await renderInRouter(
      <NeedsYouStrip
        needsYou={buildNeedsYou(queue({ proposal: 3, import: 3 }))}
      />
    )
    expect(strip()).toHaveAttribute("data-mock", PROPOSALS_MOCK_ID)
    expect(screen.getByText("Example")).toBeVisible()
  })

  it("leaves a real-only strip unmarked", async () => {
    await renderInRouter(
      <NeedsYouStrip
        needsYou={buildNeedsYou(queue({ import: 4, receipt: 4 }))}
      />
    )
    expect(strip()).not.toHaveAttribute("data-mock")
    expect(screen.queryByText("Example")).toBeNull()
  })

  it("tells a screen reader which count is invented", async () => {
    await renderInRouter(
      <NeedsYouStrip
        needsYou={buildNeedsYou(queue({ proposal: 3, import: 3, receipt: 1 }))}
      />
    )
    const items = document.querySelectorAll('[data-slot="needs-you-item"]')
    const marked = Array.from(items).filter((item) =>
      item.textContent?.includes("(example data)")
    )
    expect(marked).toHaveLength(1)
  })

  it("says the counts are a floor whenever the rail badge hedges, even with no import line", async () => {
    await renderInRouter(
      <NeedsYouStrip
        needsYou={buildNeedsYou(queue({ proposal: 3, receipt: 3 }, true))}
      />
    )
    expect(
      document.querySelectorAll('[data-slot="needs-you-item"]')
    ).toHaveLength(2)
    expect(
      document.querySelector('[data-slot="needs-you-floor"]')
    ).toBeVisible()
  })

  it("stays quiet when the whole queue has been read", async () => {
    await renderInRouter(
      <NeedsYouStrip needsYou={buildNeedsYou(queue({ proposal: 3 }))} />
    )
    expect(document.querySelector('[data-slot="needs-you-floor"]')).toBeNull()
  })

  it("renders every count through the figure contract", async () => {
    await renderInRouter(
      <NeedsYouStrip
        needsYou={buildNeedsYou(queue({ proposal: 3, import: 3, receipt: 2 }))}
      />
    )
    const figures = document.querySelectorAll(
      '[data-slot="needs-you-item"] [data-figure]'
    )
    expect(figures).toHaveLength(3)
    expect(Array.from(figures).map((figure) => figure.textContent)).toEqual([
      "3",
      "3",
      "2",
    ])
  })
})
