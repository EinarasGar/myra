import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { LedgerTransactionRow } from "../api"
import { isTransactionRow, toLedgerRows, toLookupIndex } from "../api"
import {
  assetPurchase,
  ghostTransfer,
  individualItem,
  lookupTables,
  regular,
} from "../api/fixtures"

const useTransactionDetail = vi.fn()
const deleteMutate = vi.fn()
const applyIntent = vi.fn()

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  useTransactionDetail: (input: unknown) =>
    useTransactionDetail(input) as unknown,
  useDeleteTransaction: () => ({
    mutate: deleteMutate as unknown,
    isPending: false,
  }),
  useApplyVisibility: () => ({
    applyIntent: applyIntent as unknown,
    isPending: false,
  }),
}))

const { TransactionDrawer } = await import("./test-harness")
const { renderTransactions, stubViewport, TEST_USER_ID } =
  await import("../review/test-harness")

function rowOf(item: ReturnType<typeof individualItem>): LedgerTransactionRow {
  const [row] = toLedgerRows([item], toLookupIndex(lookupTables)).filter(
    isTransactionRow
  )
  if (row === undefined) throw new Error("no row")
  return row
}

function detail(overrides: Record<string, unknown> = {}) {
  return {
    detail: {
      lookup: toLookupIndex(lookupTables),
      raw: { transaction: regular(), lookup_tables: lookupTables },
    },
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: () => {},
    ...overrides,
  }
}

async function renderDrawer(
  props: Partial<Parameters<typeof TransactionDrawer>[0]> = {}
) {
  const row = rowOf(individualItem(assetPurchase()))
  return renderTransactions(
    <TransactionDrawer
      userId={TEST_USER_ID}
      transactionId={row.transactionId}
      row={row}
      open
      onOpenChange={() => {}}
      {...props}
    />
  )
}

beforeEach(() => {
  stubViewport(1440)
  useTransactionDetail.mockReturnValue(detail())
})

describe("TransactionDrawer", () => {
  it("names the transaction in the header and keeps the eyebrow", async () => {
    await renderDrawer()
    expect(screen.getByText("Transaction")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /Buy VUSA\.LSE/ })
    ).toBeInTheDocument()
  })

  it("renders every entry as a native figure, never a base-currency one", async () => {
    await renderDrawer()
    const entries = document.querySelector('[data-slot="drawer-entries"]')
    expect(entries).not.toBeNull()
    expect(
      within(entries as HTMLElement).getByText("+8.0000 VUSA.LSE")
    ).toBeVisible()
    expect(
      within(entries as HTMLElement).getAllByText("−£672.80").length
    ).toBeGreaterThan(0)
  })

  it("states the net cash effect and refuses to value the units", async () => {
    await renderDrawer()
    const net = document.querySelector('[data-slot="drawer-net-effect"]')
    expect(net).not.toBeNull()
    expect(within(net as HTMLElement).getByText("−£672.80")).toBeVisible()
    expect(
      screen.getByText(/no transaction carries a base-currency amount/i)
    ).toBeVisible()
  })

  it("says the ledger records no provenance rather than inventing one", async () => {
    await renderDrawer()
    expect(screen.getByText(/Not recorded/)).toBeVisible()
  })

  it("computes a unit price from the two legs", async () => {
    await renderDrawer()
    const details = document.querySelector('[data-slot="drawer-details"]')
    expect(within(details as HTMLElement).getByText("£84.10")).toBeVisible()
  })

  it("offers Mark reviewed only on an unreviewed transaction", async () => {
    const ghost = rowOf(individualItem(ghostTransfer()))
    const { rerender } = await renderDrawer()
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).toBeNull()

    rerender(
      <TransactionDrawer
        userId={TEST_USER_ID}
        transactionId={ghost.transactionId}
        row={ghost}
        open
        onOpenChange={() => {}}
      />
    )
    expect(
      screen.getByRole("button", { name: "Mark reviewed" })
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Mark reviewed" }))
    expect(applyIntent).toHaveBeenCalledWith(
      [{ transactionId: "tx-ghost", visibility: "ghost" }],
      "markReviewed",
      expect.anything()
    )
  })

  it("asks before a permanent delete and only writes on the second press", async () => {
    await renderDrawer()
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(deleteMutate).not.toHaveBeenCalled()
    expect(screen.getByText("Delete permanently?")).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(deleteMutate).toHaveBeenCalledWith(
      { transactionId: "tx-purchase" },
      expect.anything()
    )
  })

  it("steps through the list from the header", async () => {
    const onStep = vi.fn()
    await renderDrawer({
      cursor: {
        position: 2,
        total: 5,
        totalIsLowerBound: false,
        canStepBack: true,
        canStepForward: true,
        isLoadingMore: false,
        onStep,
      },
    })
    await userEvent.click(
      screen.getByRole("button", { name: "Next transaction" })
    )
    expect(onStep).toHaveBeenCalledWith(1)
    await userEvent.click(
      screen.getByRole("button", { name: "Previous transaction" })
    )
    expect(onStep).toHaveBeenCalledWith(-1)
  })

  it("says its denominator is only what is loaded, and keeps ↓ live for the rest", async () => {
    await renderDrawer({
      cursor: {
        position: 49,
        total: 49,
        totalIsLowerBound: true,
        canStepBack: true,
        canStepForward: true,
        isLoadingMore: false,
        onStep: vi.fn(),
      },
    })
    const stepper = document.querySelector('[data-slot="drawer-stepper"]')
    expect(stepper?.textContent).toContain("49 / 49")
    expect(stepper?.textContent).toContain("loaded")
    expect(
      screen.getByRole("button", { name: "Next transaction" })
    ).toBeEnabled()
    expect(
      screen.getByLabelText("Transaction 49 of 49 loaded so far")
    ).toBeInTheDocument()
  })

  it("says so while it is fetching the page the next step needs", async () => {
    await renderDrawer({
      cursor: {
        position: 49,
        total: 49,
        totalIsLowerBound: true,
        canStepBack: true,
        canStepForward: true,
        isLoadingMore: true,
        onStep: vi.fn(),
      },
    })
    expect(
      document.querySelector('[data-slot="drawer-stepper"]')?.textContent
    ).toContain("loading…")
    expect(
      screen.getByLabelText("Transaction 49 of 49, loading more")
    ).toBeInTheDocument()
  })

  it("drops the qualifier once the whole set is loaded", async () => {
    await renderDrawer({
      cursor: {
        position: 2,
        total: 5,
        totalIsLowerBound: false,
        canStepBack: true,
        canStepForward: true,
        isLoadingMore: false,
        onStep: vi.fn(),
      },
    })
    const stepper = document.querySelector('[data-slot="drawer-stepper"]')
    expect(stepper?.textContent).not.toContain("loaded")
    expect(screen.getByLabelText("Transaction 2 of 5")).toBeInTheDocument()
  })

  it("disables the step that would fall off the end of the list", async () => {
    await renderDrawer({
      cursor: {
        position: 1,
        total: 3,
        totalIsLowerBound: false,
        canStepBack: false,
        canStepForward: true,
        isLoadingMore: false,
        onStep: vi.fn(),
      },
    })
    expect(
      screen.getByRole("button", { name: "Previous transaction" })
    ).toBeDisabled()
  })

  it("offers no raw response disclosure", async () => {
    await renderDrawer()
    expect(screen.queryByRole("button", { name: /Raw response/ })).toBeNull()
    expect(screen.queryByText(/"lookup_tables"/)).toBeNull()
  })

  it("shows a skeleton, not an empty panel, before the detail arrives", async () => {
    useTransactionDetail.mockReturnValue(
      detail({ detail: undefined, isPending: true })
    )
    await renderDrawer({ row: null })
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy")
  })

  it("surfaces a failed fetch with a retry when there is no row to fall back on", async () => {
    useTransactionDetail.mockReturnValue(
      detail({ detail: undefined, isError: true, error: new Error("boom") })
    )
    await renderDrawer({ row: null })
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible()
  })

  it("blocks Edit and Add to group with a stated reason when no caller wires them", async () => {
    await renderDrawer()
    const edit = screen.getByRole("button", { name: "Edit" })
    expect(edit).toBeDisabled()
    expect(edit).toHaveAttribute(
      "title",
      expect.stringContaining("not available from this panel")
    )
    expect(screen.getByRole("button", { name: "Add to group" })).toBeDisabled()
  })

  it("enables Edit as soon as a caller supplies the editor seam", async () => {
    const onEdit = vi.fn()
    await renderDrawer({ onEdit })
    await userEvent.click(screen.getByRole("button", { name: "Edit" }))
    expect(onEdit).toHaveBeenCalledWith("tx-purchase")
  })
})
