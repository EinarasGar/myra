import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const groupIndividualTransactions = vi.fn()
const updateTransactionGroup = vi.fn()
const updateAnExistingIndividualTransaction = vi.fn()
const searchCategories = vi.fn()
const getCategories = vi.fn()
const getUserCategoryTypes = vi.fn()
const getIndividualTransactions = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  groupIndividualTransactions,
  updateTransactionGroup,
  updateAnExistingIndividualTransaction,
  searchCategories,
  getCategories,
  getUserCategoryTypes,
  getIndividualTransactions,
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
  apiClient: { get: vi.fn() },
}))

const toastAdd = vi.fn()
vi.mock("@/components/ui/toast", () => ({
  toast: { add: toastAdd, close: vi.fn(), update: vi.fn(), promise: vi.fn() },
}))

const { toLookupIndex, toTransactionRow } = await import("../api")
const { CATEGORY_GROCERIES, DAY, lookupTables, regular } =
  await import("../api/fixtures")
const { GroupComposer } = await import("./group-composer")
const { useGrouping } = await import("./use-grouping")
const { renderExplore, TEST_USER_ID, stubViewport, VIEWPORTS } =
  await import("../explore/test-harness")

const LOOKUP = toLookupIndex(lookupTables)

function row(transactionId: string, description: string) {
  return toTransactionRow(
    regular({ transaction_id: transactionId, description }),
    LOOKUP
  )
}

const MEMBERS = [row("tx-a", "Tesco"), row("tx-b", "Tesco")]

function ComposerHost() {
  const grouping = useGrouping(TEST_USER_ID)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          grouping.composer.openCreate(MEMBERS)
        }}
      >
        open composer
      </button>
      <GroupComposer
        userId={TEST_USER_ID}
        controller={grouping.composer}
        actions={grouping.actions}
        now={new Date(DAY * 1000)}
      />
    </>
  )
}

async function openComposer() {
  const result = await renderExplore(<ComposerHost />)
  fireEvent.click(screen.getByRole("button", { name: "open composer" }))
  await screen.findByRole("dialog")
  return result
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create group" }))
}

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  toastAdd.mockClear()
  groupIndividualTransactions.mockReset()
  groupIndividualTransactions.mockResolvedValue({
    data: { group: { group_id: "group-created", transactions: [] } },
  })
  updateAnExistingIndividualTransaction.mockReset()
  updateAnExistingIndividualTransaction.mockResolvedValue({
    data: { transaction: {} },
  })
  searchCategories.mockResolvedValue({
    data: {
      results: [
        {
          id: CATEGORY_GROCERIES,
          category: "Groceries",
          category_type: 2,
          icon: "shopping-cart",
          is_global: true,
          is_system: false,
        },
      ],
      total_results: 1,
      lookup_tables: { category_types: [] },
    },
  })
  getCategories.mockResolvedValue({ data: { categories: [] } })
  getUserCategoryTypes.mockResolvedValue({
    data: {
      category_types: [{ id: 2, name: "Everyday", is_global: true }],
    },
  })
  getIndividualTransactions.mockResolvedValue({
    data: {
      results: [],
      has_more: false,
      lookup_tables: { accounts: [], assets: [], categories: [] },
    },
  })
})

afterEach(() => {
  cleanup()
})

describe("GroupComposer", () => {
  it("seeds the form from the rows the user picked", async () => {
    await openComposer()
    expect(screen.getByDisplayValue("Tesco")).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="group-members-note"]')?.textContent
    ).toContain("2 transactions become 1 ledger row")
  })

  it("lists every picked member with a way to drop it", async () => {
    await openComposer()
    expect(
      document.querySelectorAll('[data-slot="group-member"]')
    ).toHaveLength(2)
    fireEvent.click(
      screen.getAllByRole("button", {
        name: /Remove from this group: Tesco/,
      })[0]!
    )
    expect(
      document.querySelectorAll('[data-slot="group-member"]')
    ).toHaveLength(1)
  })

  it("refuses to submit a group of one and says so", async () => {
    await openComposer()
    fireEvent.click(
      screen.getAllByRole("button", { name: /Remove from this group/ })[0]!
    )
    submit()
    await screen.findByText(/at least two transactions/i)
    expect(groupIndividualTransactions).not.toHaveBeenCalled()
  })

  it("refuses to submit without a description", async () => {
    await openComposer()
    fireEvent.change(screen.getByDisplayValue("Tesco"), {
      target: { value: "  " },
    })
    submit()
    await screen.findByText("A group needs a description.")
    expect(groupIndividualTransactions).not.toHaveBeenCalled()
  })

  it("sends the whole membership, the date and the category", async () => {
    await openComposer()
    submit()

    await waitFor(() => {
      expect(groupIndividualTransactions).toHaveBeenCalledTimes(1)
    })
    const [userId, body] = groupIndividualTransactions.mock.calls[0] as [
      string,
      {
        description: string
        date: number
        category_id: number
        transactions: { transaction_id: string }[]
      },
    ]
    expect(userId).toBe(TEST_USER_ID)
    expect(body.description).toBe("Tesco")
    expect(body.date).toBe(DAY)
    expect(body.category_id).toBe(CATEGORY_GROCERIES)
    expect(body.transactions.map((item) => item.transaction_id)).toEqual([
      "tx-a",
      "tx-b",
    ])
  })

  it("offers an Undo that moves every member back out instead of deleting it", async () => {
    await openComposer()
    submit()

    await waitFor(() => {
      expect(toastAdd).toHaveBeenCalled()
    })
    const options = toastAdd.mock.calls[0]?.[0] as {
      title: string
      actionProps: { onClick: () => void }
    }
    expect(options.title).toBe("Grouped")

    options.actionProps.onClick()

    await waitFor(() => {
      expect(updateAnExistingIndividualTransaction).toHaveBeenCalledTimes(2)
    })
    const [, transactionId, payload] = updateAnExistingIndividualTransaction
      .mock.calls[0] as [
      string,
      string,
      { transaction: Record<string, unknown> },
    ]
    expect(transactionId).toBe("tx-a")
    expect(payload.transaction).not.toHaveProperty("transaction_id")
  })
})
