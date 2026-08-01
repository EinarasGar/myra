import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { IdentifiableQuickUploadResponse } from "@/api"
import { columnTrackCount } from "@/components/primitives"
import { SHELL_WIDTHS, type ShellWidth } from "@/components/layout/breakpoints"

import {
  ghostTransfer,
  individualItem,
  lookupTables,
  regular,
} from "../api/fixtures"
import { toLedgerRows, toLookupIndex } from "../api"
import { buildReviewQueue } from "./api"

const useReviewItems = vi.fn()
const completeMutate = vi.fn()
const applyIntent = vi.fn()
const deleteMutate = vi.fn()

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  useReviewItems: (userId: unknown) => useReviewItems(userId) as unknown,
  useCompleteQuickUpload: () => ({
    mutate: completeMutate as unknown,
    isPending: false,
  }),
  useQuickUploads: () => ({ data: [], isError: false, refetch: () => {} }),
  useQuickUploadWatcher: () => ({
    steps: {},
    failures: {},
    clearFailure: () => {},
  }),
  useCreateQuickUpload: () => ({ mutateAsync: async () => {} }),
  useRetryQuickUpload: () => ({ mutate: () => {}, isPending: false }),
}))

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  useApplyVisibility: () => ({
    applyIntent: applyIntent as unknown,
    isPending: false,
  }),
  useDeleteTransaction: () => ({
    mutate: deleteMutate as unknown,
    isPending: false,
  }),
  useTransactionDetail: () => ({
    detail: undefined,
    isPending: true,
    isError: false,
    error: null,
    isFetching: false,
    refetch: () => {},
  }),
}))

const { ReviewScreen } = await import("./review-screen")
const { useTransactionEditor } = await import("../editor")

function ReviewHost() {
  return <ReviewScreen editor={useTransactionEditor()} />
}
const { QUEUE_COLUMNS, queueCellCount } = await import("./presentation")
const { renderTransactions, stubViewport } = await import("./test-harness")

const NOW = new Date("2026-07-26T12:00:00.000Z")

function ghost(id: string) {
  return individualItem({ ...ghostTransfer(), transaction_id: id })
}

function upload(id: string): IdentifiableQuickUploadResponse {
  return {
    id,
    created_at: "2026-07-26T06:12:00.000Z",
    updated_at: "2026-07-26T06:14:00.000Z",
    source_file_id: "file-1",
    status: "proposal_ready",
    proposal_type: "receipt",
    proposal_data: { description: "Tesco Express", date: "2026-07-25" },
  }
}

function view(overrides: Partial<Parameters<typeof buildReviewQueue>[0]> = {}) {
  return buildReviewQueue({
    rows: toLedgerRows(
      [ghost("g1"), ghost("g2"), ghost("g3"), individualItem(regular())],
      toLookupIndex(lookupTables)
    ),
    uploads: [upload("u1")],
    receiptsUnavailable: false,
    hasMoreLedger: false,
    includeProposals: true,
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
    ledgerLoadedCount: 4,
    ...overrides,
  }
}

function card(): HTMLElement {
  const node = document.querySelector('[data-slot="review-card"]')
  if (node === null) throw new Error("no review card")
  return node as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  stubViewport(1440)
  useReviewItems.mockReturnValue(queue())
})

describe("ReviewScreen states", () => {
  it("shows a static skeleton that mirrors the card, not a spinner", async () => {
    useReviewItems.mockReturnValue(queue({ isPending: true }))
    await renderTransactions(<ReviewHost />)
    const skeleton = document.querySelector('[data-slot="review-skeleton"]')
    expect(skeleton).not.toBeNull()
    expect(skeleton?.querySelector(".animate-spin")).toBeNull()
  })

  it("surfaces a ledger failure with a retry instead of an empty queue", async () => {
    const refetch = vi.fn()
    useReviewItems.mockReturnValue(
      queue({ isError: true, error: new Error("nope"), refetch })
    )
    await renderTransactions(<ReviewHost />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalled()
  })

  it("tells a day-one account apart from a cleared queue", async () => {
    useReviewItems.mockReturnValue(
      queue({
        view: view({ rows: [], uploads: [], includeProposals: false }),
        ledgerLoadedCount: 0,
      })
    )
    await renderTransactions(<ReviewHost />)
    expect(screen.getByText("Nothing to review yet")).toBeVisible()

    cleanup()
    useReviewItems.mockReturnValue(
      queue({
        view: view({ rows: [], uploads: [], includeProposals: false }),
        ledgerLoadedCount: 12,
      })
    )
    await renderTransactions(<ReviewHost />)
    expect(screen.getByText("Nothing is waiting on you")).toBeVisible()
  })

  it("says the count is a lower bound while the ledger has more pages", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ hasMoreLedger: true }), hasMoreLedger: true })
    )
    await renderTransactions(<ReviewHost />)
    expect(
      screen.getByText(/counts only the 4 rows loaded so far/)
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Look further back" })
    ).toBeVisible()
  })

  it("keeps the queue when receipts are unavailable and says what is missing", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ uploads: [], receiptsUnavailable: true }) })
    )
    await renderTransactions(<ReviewHost />)
    expect(screen.getByText(/Receipts could not be loaded/)).toBeVisible()
    expect(card()).toBeInTheDocument()
  })

  it("offers the receipt upload from the queue and from an empty queue", async () => {
    await renderTransactions(<ReviewHost />)
    expect(screen.getByRole("button", { name: "Snap a receipt" })).toBeVisible()

    cleanup()
    useReviewItems.mockReturnValue(
      queue({
        view: view({ rows: [], uploads: [], includeProposals: false }),
        ledgerLoadedCount: 0,
      })
    )
    await renderTransactions(<ReviewHost />)
    await userEvent.click(
      screen.getByRole("button", { name: "Snap a receipt" })
    )
    expect(await screen.findByText("Drop a receipt here")).toBeVisible()
  })

  it("mentions receipts that are still being read", async () => {
    useReviewItems.mockReturnValue(
      queue({
        view: view({
          uploads: [{ ...upload("u2"), status: "processing" }],
        }),
      })
    )
    await renderTransactions(<ReviewHost />)
    expect(screen.getByText(/still being read/)).toBeVisible()
  })
})

describe("ReviewScreen queue", () => {
  it("reviews one item at a time and states where it is in the queue", async () => {
    await renderTransactions(<ReviewHost />)
    expect(document.querySelectorAll('[data-slot="review-card"]')).toHaveLength(
      1
    )
    const progress = screen.getByRole("progressbar")
    expect(progress).toHaveAttribute("aria-valuenow", "1")
    expect(progress).toHaveAttribute("aria-valuemax", "7")
  })

  it("leads with a real unreviewed import, not the invented proposals", async () => {
    await renderTransactions(<ReviewHost />)
    expect(card()).toHaveAttribute("data-source", "import")
    expect(card().hasAttribute("data-mock")).toBe(false)
  })

  it("marks a proposal card as mock data on both the element and the badge", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ rows: [], uploads: [] }) })
    )
    await renderTransactions(<ReviewHost />)
    expect(card()).toHaveAttribute("data-mock", "transactions.review-proposals")
    expect(within(card()).getByText("Example")).toBeVisible()
  })

  it("blocks confirm on a proposal and says why in the button's own title", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ rows: [], uploads: [] }) })
    )
    await renderTransactions(<ReviewHost />)
    const confirm = screen.getByRole("button", { name: /^Confirm/ })
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute(
      "title",
      expect.stringContaining("inside its own conversation")
    )
    expect(applyIntent).not.toHaveBeenCalled()
  })
})

describe("ReviewScreen actions", () => {
  it("confirms the item under the cursor through the bulk visibility endpoint", async () => {
    await renderTransactions(<ReviewHost />)
    await userEvent.click(
      screen.getByRole("button", { name: /^Mark reviewed/ })
    )
    expect(applyIntent).toHaveBeenCalledWith(
      [{ transactionId: "g1", visibility: "ghost" }],
      "markReviewed",
      expect.anything()
    )
  })

  it("confirms from the keyboard too", async () => {
    await renderTransactions(<ReviewHost />)
    await userEvent.keyboard("{Enter}")
    expect(applyIntent).toHaveBeenCalledWith(
      [{ transactionId: "g1", visibility: "ghost" }],
      "markReviewed",
      expect.anything()
    )
  })

  it("skips forward with the arrow key without writing anything", async () => {
    await renderTransactions(<ReviewHost />)
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2"
    )
    expect(applyIntent).not.toHaveBeenCalled()
  })

  it("never deletes on a single keypress", async () => {
    await renderTransactions(<ReviewHost />)
    await userEvent.keyboard("{Backspace}")
    expect(deleteMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/Delete permanently\?/)).toBeVisible()

    await userEvent.keyboard("{Backspace}")
    expect(deleteMutate).toHaveBeenCalledWith(
      { transactionId: "g1" },
      expect.anything()
    )
  })

  it("lets the reviewer back out of a delete", async () => {
    await renderTransactions(<ReviewHost />)
    await userEvent.click(screen.getByRole("button", { name: /^Delete/ }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(deleteMutate).not.toHaveBeenCalled()
    expect(screen.queryByText(/Delete permanently\?/)).toBeNull()
  })

  it("offers one bulk confirm for every import it can see", async () => {
    await renderTransactions(<ReviewHost />)
    await userEvent.click(
      screen.getByRole("button", {
        name: "Mark all 3 unreviewed imports reviewed",
      })
    )
    expect(applyIntent).toHaveBeenCalledWith(
      [
        { transactionId: "g1", visibility: "ghost" },
        { transactionId: "g2", visibility: "ghost" },
        { transactionId: "g3", visibility: "ghost" },
      ],
      "markReviewed",
      expect.anything()
    )
  })

  it("files a receipt against the real quick-upload endpoint", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ rows: [], includeProposals: false }) })
    )
    await renderTransactions(<ReviewHost />)
    expect(card()).toHaveAttribute("data-source", "receipt")
    await userEvent.click(screen.getByRole("button", { name: /^File it/ }))
    expect(completeMutate).toHaveBeenCalledWith({
      quickUploadId: "u1",
      accepted: true,
    })
  })

  it("reads the receipt's draft back in words, with no amount invented", async () => {
    useReviewItems.mockReturnValue(
      queue({ view: view({ rows: [], includeProposals: false }) })
    )
    await renderTransactions(<ReviewHost />)
    expect(within(card()).getByText("Tesco Express")).toBeVisible()
    expect(
      within(card()).getByText(/drafted one transaction dated 25 Jul 2026/)
    ).toBeVisible()
    expect(within(card()).queryByText(/[{}]/)).toBeNull()
    expect(
      within(card()).getByLabelText(/nothing to state an amount in/)
    ).toBeVisible()
  })

  it("ends the pass once every item has been skipped", async () => {
    await renderTransactions(<ReviewHost />)
    for (let index = 0; index < 7; index += 1) {
      await userEvent.keyboard("{ArrowRight}")
    }
    expect(screen.getByText("That's the end of this pass")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Start over" }))
    expect(card()).toHaveAttribute("data-source", "import")
  })
})

describe("ReviewScreen at every width", () => {
  const widths: Record<ShellWidth, number> = {
    full: 1440,
    tight: 1100,
    stacked: 900,
    phone: 390,
  }

  it.each(SHELL_WIDTHS)(
    "emits one up-next cell per declared track at %s",
    async (width) => {
      stubViewport(widths[width])
      await renderTransactions(<ReviewHost />)
      const tracks = columnTrackCount(QUEUE_COLUMNS[width])
      expect(queueCellCount(width)).toBe(tracks)
      const rows = document.querySelectorAll('[data-slot="data-row"]')
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(row.childElementCount).toBe(tracks)
      }
    }
  )

  it("hides the key badges below 1024px rather than promising a keyboard", async () => {
    stubViewport(1440)
    await renderTransactions(<ReviewHost />)
    expect(
      document.querySelectorAll('[data-slot="key-badge"]').length
    ).toBeGreaterThan(0)

    cleanup()
    stubViewport(900)
    await renderTransactions(<ReviewHost />)
    expect(document.querySelectorAll('[data-slot="key-badge"]')).toHaveLength(0)
  })

  it("folds the rest of the queue rather than dropping it silently", async () => {
    stubViewport(390)
    await renderTransactions(<ReviewHost />)
    const fold = document.querySelector('[data-slot="table-fold-row"]')
    expect(fold).not.toBeNull()
    expect(within(fold as HTMLElement).getByRole("button")).toHaveTextContent(
      "+3 more"
    )
  })
})
