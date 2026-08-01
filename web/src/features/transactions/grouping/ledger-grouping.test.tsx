import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getTransactions = vi.fn()
const updateAnExistingIndividualTransaction = vi.fn()
const updateTransactionGroup = vi.fn()
const getTransactionGroups = vi.fn()
const apiGet = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getTransactions,
  updateAnExistingIndividualTransaction,
  updateTransactionGroup,
  getTransactionGroups,
}

vi.mock("@/lib/api", () => ({
  api: () =>
    new Proxy(
      {},
      {
        get: (_target, name: string) =>
          ENDPOINTS[name] ?? (() => Promise.resolve({ data: {} })),
      }
    ),
  apiClient: { get: apiGet },
}))

const toastAdd = vi.fn()
vi.mock("@/components/ui/toast", () => ({
  toast: { add: toastAdd, close: vi.fn(), update: vi.fn(), promise: vi.fn() },
}))

const {
  accountFees,
  cashDividend,
  combinedPage,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} = await import("../api/fixtures")
const { ExploreScreen } = await import("../explore")
const { useTransactionEditor } = await import("../editor")
const { useGrouping } = await import("./use-grouping")
const { GroupComposer } = await import("./group-composer")
const {
  createTestQueryClient,
  renderExplore,
  stubViewport,
  TEST_USER_ID,
  useSearchStub,
  VIEWPORTS,
} = await import("../explore/test-harness")

const ITEMS = [
  individualItem(regular()),
  individualItem(cashDividend()),
  individualItem(accountFees()),
  groupItem([
    regular({ transaction_id: "tx-child", description: "Receipt line" }),
    accountFees(),
  ]),
]

/** Mirrors the route, which owns the composer so the New-transaction menu can open it too. */
function ExploreHost() {
  const grouping = useGrouping(TEST_USER_ID)
  const stub = useSearchStub()
  return (
    <>
      <ExploreScreen
        search={stub.search}
        onPatch={stub.onPatch}
        editor={useTransactionEditor()}
        grouping={grouping}
      />
      <GroupComposer
        userId={TEST_USER_ID}
        controller={grouping.composer}
        actions={grouping.actions}
      />
    </>
  )
}

async function renderLedger() {
  const result = await renderExplore(<ExploreHost />, createTestQueryClient())
  await waitFor(() => {
    expect(
      document.querySelectorAll('[data-slot="ledger-row"]').length
    ).toBeGreaterThan(0)
  })
  return result
}

function selectRows(count: number) {
  const boxes = screen
    .getAllByRole("checkbox")
    .filter((box) => box.getAttribute("aria-label")?.startsWith("Select "))
    .filter(
      (box) =>
        box.getAttribute("aria-label") !== "Select every loaded transaction"
    )
  for (const box of boxes.slice(0, count)) fireEvent.click(box)
}

function groupButton() {
  return document.querySelector<HTMLButtonElement>(
    '[data-slot="selection-group"]'
  )
}

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  toastAdd.mockClear()
  getTransactions.mockReset()
  getTransactions.mockResolvedValue({ data: combinedPage(ITEMS) })
  updateAnExistingIndividualTransaction.mockReset()
  updateAnExistingIndividualTransaction.mockResolvedValue({
    data: { transaction: {} },
  })
  updateTransactionGroup.mockReset()
  updateTransactionGroup.mockResolvedValue({ data: { group: {} } })
  getTransactionGroups.mockResolvedValue({
    data: { results: [], has_more: false, lookup_tables: {} },
  })
  apiGet.mockReset()
  apiGet.mockResolvedValue({
    data: { transaction: regular(), lookup_tables: lookupTables },
  })
})

afterEach(cleanup)

describe("the selection bar's grouping action", () => {
  it("is refused, with a reason, until two transactions are picked", async () => {
    await renderLedger()
    selectRows(1)
    await waitFor(() => {
      expect(groupButton()).not.toBeNull()
    })
    expect(groupButton()).toBeDisabled()
    expect(
      document.querySelector('[data-slot="selection-note"]')?.textContent
    ).toContain("at least two transactions")
  })

  it("names the count and opens the composer seeded with those rows", async () => {
    await renderLedger()
    selectRows(2)
    await waitFor(() => {
      expect(groupButton()).toHaveTextContent("Group these 2")
    })
    fireEvent.click(groupButton() as HTMLButtonElement)

    await screen.findByText("New group")
    expect(
      document.querySelectorAll('[data-slot="group-member"]')
    ).toHaveLength(2)
  })

  it("offers each group row a way to take the selection in", async () => {
    await renderLedger()
    expect(document.querySelector('[data-slot="group-row-offer"]')).toBeNull()

    selectRows(2)
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="group-row-offer"]')
      ).toHaveTextContent("Add 2 here")
    })
  })
})

describe("the drawer on a row inside a group", () => {
  async function openChild() {
    const expander = document.querySelector<HTMLElement>(
      '[data-slot="group-disclosure"]'
    )
    fireEvent.click(expander as HTMLElement)
    const child = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        '[data-slot="ledger-child-row"]'
      )
      expect(found).not.toBeNull()
      return found as HTMLElement
    })
    fireEvent.click(child)
    return screen.findByRole("dialog")
  }

  it("offers a move out of the group and names the group it is in", async () => {
    await renderLedger()
    const drawer = await openChild()
    expect(
      screen.getByRole("button", { name: "Remove from group" })
    ).toBeEnabled()
    expect(drawer).toHaveTextContent("Weekly shop")
  })

  it("moves the row out with the transaction's own body and offers an Undo", async () => {
    await renderLedger()
    await openChild()
    fireEvent.click(screen.getByRole("button", { name: "Remove from group" }))

    await waitFor(() => {
      expect(updateAnExistingIndividualTransaction).toHaveBeenCalledTimes(1)
    })
    const [, transactionId, payload] = updateAnExistingIndividualTransaction
      .mock.calls[0] as [
      string,
      string,
      { transaction: Record<string, unknown> },
    ]
    expect(transactionId).toBe("tx-child")
    expect(payload.transaction.description).toBe("Receipt line")

    const options = toastAdd.mock.calls.at(-1)?.[0] as {
      title: string
      actionProps: { onClick: () => void }
    }
    expect(options.title).toBe("Removed from group")

    options.actionProps.onClick()
    await waitFor(() => {
      expect(updateTransactionGroup).toHaveBeenCalledTimes(1)
    })
    const [groupId, , body] = updateTransactionGroup.mock.calls[0] as [
      string,
      string,
      { transactions: { transaction_id: string }[] },
    ]
    expect(groupId).toBe("group-1")
    expect(body.transactions.map((item) => item.transaction_id)).toContain(
      "tx-child"
    )
  })
})

describe("the drawer on a row that is not in a group", () => {
  it("offers a way into an existing group", async () => {
    await renderLedger()
    const row = document.querySelector<HTMLElement>(
      '[data-slot="ledger-row"]:not([data-group="true"])'
    )
    fireEvent.click(row as HTMLElement)
    await screen.findByRole("dialog")

    const add = screen.getByRole("button", { name: "Add to group" })
    expect(add).toBeEnabled()
    fireEvent.click(add)

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="group-picker-dialog"]')
      ).not.toBeNull()
    })
  })
})
