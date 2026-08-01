import { describe, expect, it } from "vitest"

import type { IdentifiableQuickUploadResponse } from "@/api"
import { MOCK_REVIEW_PROPOSALS } from "@/lib/mock"

import {
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} from "../../api/fixtures"
import { toLedgerRows, toLookupIndex } from "../../api"
import { buildReviewQueue, queueSummary, unreviewedTransactions } from "./queue"

const NOW = new Date("2026-07-26T12:00:00.000Z")

function lookup() {
  return toLookupIndex(lookupTables)
}

function upload(
  overrides: Partial<IdentifiableQuickUploadResponse> = {}
): IdentifiableQuickUploadResponse {
  return {
    id: "upload-1",
    created_at: "2026-07-26T06:12:00.000Z",
    updated_at: "2026-07-26T06:14:00.000Z",
    source_file_id: "file-1",
    status: "proposal_ready",
    proposal_type: "receipt",
    proposal_data: {
      description: "Tesco Express",
      amount: "-18.64",
      date: "2026-07-25",
    },
    ...overrides,
  }
}

function queue(
  overrides: Partial<Parameters<typeof buildReviewQueue>[0]> = {}
) {
  return buildReviewQueue({
    rows: [],
    uploads: [],
    receiptsUnavailable: false,
    hasMoreLedger: false,
    includeProposals: false,
    now: NOW,
    ...overrides,
  })
}

describe("unreviewedTransactions", () => {
  it("finds ghosts inside a group as well as at the top level", () => {
    const rows = toLedgerRows(
      [
        individualItem(regular()),
        individualItem(ghostTransfer()),
        groupItem([
          regular({ transaction_id: "child-clean" }),
          {
            ...ghostTransfer(),
            transaction_id: "child-ghost",
          },
        ]),
      ],
      lookup()
    )

    expect(
      unreviewedTransactions(rows).map((row) => row.transactionId)
    ).toEqual(["tx-ghost", "child-ghost"])
  })

  it("returns nothing when every transaction is reviewed", () => {
    const rows = toLedgerRows([individualItem(regular())], lookup())
    expect(unreviewedTransactions(rows)).toEqual([])
  })
})

describe("buildReviewQueue", () => {
  it("puts writable items ahead of the ones nothing can act on", () => {
    const rows = toLedgerRows([individualItem(ghostTransfer())], lookup())
    const view = queue({
      rows,
      uploads: [upload()],
      includeProposals: true,
    })

    expect(view.items.map((item) => item.source)).toEqual([
      "import",
      "receipt",
      ...MOCK_REVIEW_PROPOSALS.map(() => "proposal"),
    ])
    expect(view.count).toBe(2 + MOCK_REVIEW_PROPOSALS.length)
  })

  it("never invents a raw provider line for a real transaction", () => {
    const rows = toLedgerRows([individualItem(ghostTransfer())], lookup())
    const [item] = queue({ rows }).items
    expect(item?.rawSource.available).toBe(false)
    expect(item?.mockId).toBeNull()
  })

  it("renders an import's own entries and says they already count", () => {
    const rows = toLedgerRows([individualItem(ghostTransfer())], lookup())
    const [item] = queue({ rows }).items
    expect(item?.entriesTitle).toBe("Entries it already wrote")
    expect(item?.entries).toHaveLength(1)
    expect(item?.entriesNote).toContain("already in your ledger")
  })

  it("describes a receipt draft in words rather than printing its JSON", () => {
    const [item] = queue({ uploads: [upload()] }).items
    expect(item?.figure.kind).toBe("unavailable")
    expect(item?.title).toBe("Tesco Express")
    expect(item?.rawSource).toEqual({
      available: true,
      text: "Myra read this receipt and drafted one transaction dated 25 Jul 2026. Filing it writes that draft to your ledger; nothing is there yet.",
    })
    expect(JSON.stringify(item)).not.toContain("{\\n")
  })

  it("says so plainly when the draft is in a shape it cannot read", () => {
    const [item] = queue({
      uploads: [
        upload({ proposal_data: { merchant: "Tesco", total: -18.64 } }),
      ],
    }).items
    expect(item?.rawSource).toEqual({
      available: false,
      reason: expect.stringContaining("cannot display") as string,
    })
    expect(item?.title).toBe("Receipt read by Myra")
  })

  it("only queues receipts whose proposal is ready", () => {
    const view = queue({
      uploads: [
        upload({ id: "a", status: "processing" }),
        upload({ id: "b", status: "proposal_ready" }),
        upload({ id: "c", status: "failed" }),
      ],
    })
    expect(view.items.map((item) => item.quickUploadId)).toEqual(["b"])
    expect(view.receiptsWorking).toBe(1)
    expect(view.receiptsFailed).toBe(1)
  })

  it("blocks every action on a proposal because nothing can write it", () => {
    const view = queue({ includeProposals: true })
    for (const item of view.items) {
      expect(item.actions.confirm.blockedReason).not.toBeNull()
      expect(item.actions.discard.blockedReason).not.toBeNull()
      expect(item.mockId).toBe("transactions.review-proposals")
    }
    expect(view.mockIds).toEqual(["transactions.review-proposals"])
  })

  it("leaves proposals out when the ledger is empty", () => {
    expect(queue({ includeProposals: false }).items).toEqual([])
  })

  it("marks the count as a lower bound while the ledger has more pages", () => {
    expect(queue({ hasMoreLedger: true }).countIsLowerBound).toBe(true)
    expect(queue({ hasMoreLedger: false }).countIsLowerBound).toBe(false)
  })

  it("carries the receipts outage through so the screen can say so", () => {
    expect(queue({ receiptsUnavailable: true }).receiptsUnavailable).toBe(true)
  })
})

describe("queueSummary", () => {
  it("names every source that has something waiting", () => {
    expect(queueSummary({ proposal: 3, import: 3, receipt: 2 })).toBe(
      "3 Myra proposals, 3 unreviewed imports and 2 receipts — everything waiting on you, in one queue."
    )
  })

  it("uses the singular and drops empty sources", () => {
    expect(queueSummary({ proposal: 0, import: 1, receipt: 0 })).toBe(
      "1 unreviewed import — everything waiting on you, in one queue."
    )
  })

  it("says so when nothing is waiting", () => {
    expect(queueSummary({ proposal: 0, import: 0, receipt: 0 })).toBe(
      "Nothing is waiting on you."
    )
  })
})
