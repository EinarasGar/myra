import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AssetRef } from "@/lib/domain/refs"

const toastAdd = vi.fn()
vi.mock("@/components/ui/toast", () => ({
  toast: { add: toastAdd, close: vi.fn(), update: vi.fn(), promise: vi.fn() },
}))

const updateGroupMutate = vi.fn()

const CURRENCIES: AssetRef[] = [
  { assetId: 1, ticker: "GBP", name: "Pound sterling", assetTypeId: 1 },
]

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  useTransactionDetail: () => ({
    detail: undefined,
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: () => {},
  }),
  useDeleteTransaction: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTransactionGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useApplyVisibility: () => ({ applyIntent: vi.fn(), isPending: false }),
  useUpdateTransactionGroup: () => ({
    mutate: updateGroupMutate as unknown,
    error: null,
    isPending: false,
  }),
}))

vi.mock("@/features/accounts/api", () => ({
  useAccountsSuspense: () => ({ groups: [], byId: {} }),
}))

vi.mock("@/features/categories/api", () => ({
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

vi.mock("@/features/onboarding/currency-assets", () => ({
  useCurrencyAssets: () => CURRENCIES,
}))

const { TransactionPanel } = await import("./transaction-panel")
const { toGroupRow, toLookupIndex } = await import("../api")
const { groupItem, lookupTables, regular } = await import("../api/fixtures")
const { renderTransactions, stubViewport, TEST_USER_ID } =
  await import("../review/test-harness")

const EDITOR = {
  isOpen: false,
  mode: { kind: "create" } as const,
  instanceKey: "editor-1",
  setOpen: () => {},
  openCreate: () => {},
  openEdit: () => {},
  openProposal: () => {},
  close: () => {},
}

function groupRow() {
  return toGroupRow(
    groupItem([regular()]) as Parameters<typeof toGroupRow>[0],
    toLookupIndex(lookupTables)
  )
}

async function renderPanel() {
  const group = groupRow()
  const result = await renderTransactions(
    <TransactionPanel
      userId={TEST_USER_ID}
      editor={
        EDITOR as unknown as Parameters<typeof TransactionPanel>[0]["editor"]
      }
      view={{
        transactionId: null,
        groupRow: group,
        open: true,
        onOpenChange: () => {},
      }}
    />
  )
  return { group, ...result }
}

beforeEach(() => {
  stubViewport(1440)
  toastAdd.mockReset()
  updateGroupMutate.mockReset()
})

describe("TransactionPanel with a group", () => {
  it("shows the group detail rather than a transaction", async () => {
    await renderPanel()
    expect(
      screen.getByRole("heading", { name: "Weekly shop" })
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="group-drawer-hero"]')
    ).not.toBeNull()
    expect(document.querySelector('[data-slot="drawer-hero"]')).toBeNull()
  })

  it("swaps the same sheet to the group editor and back", async () => {
    await renderPanel()
    await userEvent.click(screen.getByRole("button", { name: "Edit" }))

    expect(screen.getByRole("heading", { name: "Edit group" })).toBeVisible()
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByLabelText("Description")).toHaveValue("Weekly shop")

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(
      screen.getByRole("heading", { name: "Weekly shop" })
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="group-drawer-hero"]')
    ).not.toBeNull()
  })

  it("saves the group from the editor with its children intact", async () => {
    const { group } = await renderPanel()
    await userEvent.click(screen.getByRole("button", { name: "Edit" }))
    await userEvent.clear(screen.getByLabelText("Description"))
    await userEvent.type(screen.getByLabelText("Description"), "Renamed")
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    const [variables] = updateGroupMutate.mock.calls[0] as [
      { group: { description: string; transactions: unknown[] } },
    ]
    expect(variables.group.description).toBe("Renamed")
    expect(variables.group.transactions).toStrictEqual(group.raw.transactions)
  })
})
