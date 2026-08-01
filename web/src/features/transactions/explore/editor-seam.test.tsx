import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { RequiredIdentifiableTransaction } from "@/api"

const getTransactions = vi.fn()
const updateTransaction = vi.fn()
const addTransaction = vi.fn()
const apiGet = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getTransactions,
  updateAnExistingTransaction: updateTransaction,
  addIndividualTransaction: addTransaction,
  listQuickUploads: () => Promise.resolve({ data: [] }),
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

vi.mock("@/features/accounts/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/accounts/api")>()),
  useAccountsSuspense: () => ({
    groups: [
      {
        label: "Cash",
        accounts: [
          {
            accountId: "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f",
            name: "Lloyds Current",
          },
        ],
      },
    ],
    byId: {
      "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f": { name: "Lloyds Current" },
    },
  }),
}))

vi.mock("@/features/categories/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/categories/api")>()),
  categoriesQueryOptions: () => ({
    queryKey: ["categories", "seam"],
    queryFn: () => [{ id: 7, name: "Groceries" }],
  }),
  useCategoryCatalogue: () => ({
    groups: [
      {
        type: { name: "Spending" },
        categories: [{ id: 7, name: "Groceries" }],
      },
    ],
    byId: new Map([[7, { id: 7, name: "Groceries" }]]),
  }),
}))

vi.mock("@/features/onboarding/currency-assets", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/onboarding/currency-assets")
  >()),
  useCurrencyAssets: () => [
    { assetId: 1, ticker: "GBP", name: "Pound sterling", assetTypeId: 1 },
  ],
}))

const { combinedPage, individualItem, lookupTables, regular } =
  await import("../api/fixtures")
const { TransactionsPage } = await import("@/routes/_auth/_shell/transactions")
const {
  renderExplore,
  createTestQueryClient,
  stubViewport,
  useSearchStub,
  VIEWPORTS,
} = await import("./test-harness")

const ACCOUNT = "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f"

let stored: RequiredIdentifiableTransaction

function panel(): HTMLElement {
  return screen.getByRole("dialog")
}

function TransactionsHost() {
  const stub = useSearchStub()
  return (
    <TransactionsPage
      search={{ ...stub.search, mode: "explore" }}
      onPatch={stub.onPatch}
    />
  )
}

async function renderPage() {
  return renderExplore(<TransactionsHost />, createTestQueryClient())
}

async function openFirstRow(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(
      document.querySelectorAll('[data-slot="ledger-row"]').length
    ).toBeGreaterThan(0)
  })
  const row = document.querySelector<HTMLElement>(
    '[data-slot="ledger-row"]:not([data-group="true"])'
  )
  await user.click(row as HTMLElement)
  return screen.findByRole("dialog")
}

function ledger(): HTMLElement {
  const node = document.querySelector('[data-slot="ledger-panel"]')
  if (node === null) throw new Error("no ledger panel")
  return node as HTMLElement
}

beforeEach(() => {
  stored = regular({
    entry: { account_id: ACCOUNT, asset_id: 1, amount: -42.18, entry_id: 501 },
  })
  getTransactions.mockReset()
  getTransactions.mockImplementation(() =>
    Promise.resolve({ data: combinedPage([individualItem(stored)]) })
  )
  apiGet.mockReset()
  apiGet.mockImplementation(() =>
    Promise.resolve({
      data: { transaction: stored, lookup_tables: lookupTables },
    })
  )
  updateTransaction.mockReset()
  updateTransaction.mockImplementation(
    (
      transactionId: string,
      _userId: string,
      body: { transaction: Record<string, unknown> }
    ) => {
      stored = {
        ...body.transaction,
        transaction_id: transactionId,
      } as unknown as RequiredIdentifiableTransaction
      return Promise.resolve({
        data: { transaction: body.transaction, accounts: [], assets: [] },
      })
    }
  )
  addTransaction.mockReset()
  addTransaction.mockResolvedValue({
    data: { transaction: regular({ transaction_id: "tx-new" }) },
  })
  stubViewport(VIEWPORTS.full)
})

afterEach(cleanup)

describe("the ledger reaches the editor and back", () => {
  it("opens a row, edits a field, saves, and shows the change in the ledger", async () => {
    const user = userEvent.setup()
    await renderPage()
    await openFirstRow(user)
    expect(within(ledger()).getByText("Tesco")).toBeInTheDocument()

    const edit = within(panel()).getByRole("button", { name: "Edit" })
    expect(edit).toBeEnabled()
    await user.click(edit)

    const description = await screen.findByLabelText("Description")
    await user.clear(description)
    await user.type(description, "Sainsbury's")

    await user.click(
      within(panel()).getByRole("button", { name: /Save changes/ })
    )

    await waitFor(() => {
      expect(updateTransaction).toHaveBeenCalledTimes(1)
    })
    const [transactionId, , body] = updateTransaction.mock.calls[0] as [
      string,
      string,
      { transaction: Record<string, unknown> },
    ]
    expect(transactionId).toBe("tx-regular")
    expect(body.transaction).toMatchObject({ description: "Sainsbury's" })

    await waitFor(() => {
      expect(within(ledger()).getByText("Sainsbury's")).toBeInTheDocument()
    })
    expect(within(ledger()).queryByText("Tesco")).toBeNull()

    await waitFor(() => {
      expect(
        within(panel()).getByRole("button", { name: "Add to group" })
      ).toBeInTheDocument()
    })
    expect(within(panel()).getByText("1 / 1")).toBeInTheDocument()
  })

  it("never stacks a second sheet: view and edit share one dialog", async () => {
    const user = userEvent.setup()
    await renderPage()
    await openFirstRow(user)

    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    await user.click(within(panel()).getByRole("button", { name: "Edit" }))
    await screen.findByLabelText("Description")
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
  })

  it("returns to the transaction it was editing when the editor is cancelled", async () => {
    const user = userEvent.setup()
    await renderPage()
    await openFirstRow(user)
    await user.click(within(panel()).getByRole("button", { name: "Edit" }))
    await screen.findByLabelText("Description")

    await user.click(within(panel()).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(
        within(panel()).getByRole("button", { name: "Add to group" })
      ).toBeInTheDocument()
    })
    expect(within(panel()).getByText("1 / 1")).toBeInTheDocument()
  })

  it("offers the type chooser as step 0 of the header's create action", async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: /New transaction/ }))

    const sheet = await screen.findByRole("dialog")
    expect(within(sheet).getByText("Purchase")).toBeInTheDocument()
    expect(within(sheet).getByText("Pick a type to start.")).toBeInTheDocument()
  })
})

describe("the panel at every width", () => {
  it.each(["full", "tight", "stacked", "phone"] as const)(
    "keeps one sheet with a reachable save on %s",
    async (width) => {
      stubViewport(VIEWPORTS[width])
      const user = userEvent.setup()
      await renderPage()
      await openFirstRow(user)
      await user.click(within(panel()).getByRole("button", { name: "Edit" }))
      await screen.findByLabelText("Description")

      expect(screen.getAllByRole("dialog")).toHaveLength(1)
      expect(
        within(panel()).getByRole("button", { name: /Save changes/ })
      ).toBeEnabled()

      const content = document.querySelector('[data-slot="sheet-content"]')
      expect(content?.getAttribute("data-side")).toBe(
        width === "phone" ? "bottom" : "right"
      )
    }
  )
})
