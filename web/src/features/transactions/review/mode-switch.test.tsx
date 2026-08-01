import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  ghostTransfer,
  individualItem,
  lookupTables,
  regular,
} from "../api/fixtures"
import { toLedgerRows, toLookupIndex } from "../api"
import { buildReviewQueue } from "./api"

const useReviewItems = vi.fn()

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  useReviewItems: (userId: unknown) => useReviewItems(userId) as unknown,
}))

const { ModeSwitch } = await import("./mode-switch")
const { renderTransactions, stubViewport } = await import("./test-harness")

const NOW = new Date("2026-07-26T12:00:00.000Z")

function ghost(id: string) {
  return individualItem({ ...ghostTransfer(), transaction_id: id })
}

function view(overrides: Partial<Parameters<typeof buildReviewQueue>[0]> = {}) {
  return buildReviewQueue({
    rows: toLedgerRows(
      [ghost("g1"), ghost("g2"), individualItem(regular())],
      toLookupIndex(lookupTables)
    ),
    uploads: [],
    receiptsUnavailable: false,
    hasMoreLedger: false,
    includeProposals: false,
    now: NOW,
    ...overrides,
  })
}

function queue(overrides: Record<string, unknown> = {}) {
  return {
    view: view(),
    isPending: false,
    isError: false,
    error: null,
    hasMoreLedger: false,
    isLoadingMore: false,
    loadMore: () => {},
    refetch: () => {},
    ledgerLoadedCount: 3,
    ...overrides,
  }
}

function reviewTab(): HTMLElement {
  return screen.getByRole("button", { name: /Review/ })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubViewport(1440)
  useReviewItems.mockReturnValue(queue())
})

describe("ModeSwitch", () => {
  it("counts the same queue the Review screen renders", async () => {
    await renderTransactions(<ModeSwitch mode="explore" />)
    expect(reviewTab()).toHaveTextContent("2")
  })

  it("hedges the count the same way the rail badge does when the ledger has more pages", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ hasMoreLedger: true }) })
    )
    await renderTransactions(<ModeSwitch mode="explore" />)

    const tab = screen.getByRole("button", { name: /Review/ })
    expect(tab).toHaveTextContent("2+")
    expect(tab).toHaveAttribute(
      "aria-label",
      "Review, at least 2 items need review"
    )
  })

  it("states the count plainly once the whole ledger has been read", async () => {
    await renderTransactions(<ModeSwitch mode="explore" />)

    const tab = screen.getByRole("button", { name: /Review/ })
    expect(tab.textContent).toBe("Review2")
    expect(tab).toHaveAttribute("aria-label", "Review, 2 items need review")
  })

  it("shows no count at all while the queue is still loading", async () => {
    useReviewItems.mockReturnValue(queue({ isPending: true }))
    await renderTransactions(<ModeSwitch mode="explore" />)
    expect(reviewTab().textContent).toBe("Review")
  })

  it("leaves the badge unmarked while every item in it is real", async () => {
    await renderTransactions(<ModeSwitch mode="explore" />)
    expect(document.querySelectorAll("[data-mock]")).toHaveLength(0)
  })

  it("marks only the Review side when the queue carries an invented item", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ includeProposals: true }) })
    )
    await renderTransactions(<ModeSwitch mode="explore" />)

    const marked = document.querySelectorAll("[data-mock]")
    expect(marked).toHaveLength(1)
    expect(marked[0]?.textContent).toBe("Review")
    expect(
      screen
        .getByRole("button", { name: "Explore" })
        .querySelector("[data-mock]")
    ).toBeNull()
  })
})
