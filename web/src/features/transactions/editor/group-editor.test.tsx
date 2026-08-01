import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AssetRef } from "@/lib/domain/refs"
import { normalizeHttpError } from "@/lib/errors"

const toastAdd = vi.fn()
vi.mock("@/components/ui/toast", () => ({
  toast: { add: toastAdd, close: vi.fn(), update: vi.fn(), promise: vi.fn() },
}))

const updateMutate = vi.fn()
const updateState = { error: null as unknown, isPending: false }

const CURRENCIES: AssetRef[] = [
  { assetId: 1, ticker: "GBP", name: "Pound sterling", assetTypeId: 1 },
  { assetId: 2, ticker: "USD", name: "US dollar", assetTypeId: 1 },
]

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  useUpdateTransactionGroup: () => ({
    mutate: updateMutate as unknown,
    get error() {
      return updateState.error
    },
    get isPending() {
      return updateState.isPending
    },
  }),
}))

vi.mock("@/features/accounts/api", () => ({
  useAccountsSuspense: () => ({
    groups: [
      {
        label: "Cash",
        accounts: [
          {
            accountId: "11111111-1111-1111-1111-111111111111",
            name: "Lloyds Current",
            accountTypeName: "Current",
          },
        ],
      },
    ],
    byId: {},
  }),
}))

vi.mock("@/features/categories/api", () => ({
  useCategoryCatalogue: () => ({
    groups: [
      {
        type: { name: "Spending" },
        categories: [
          { id: 7, name: "Groceries", icon: "shopping-cart" },
          { id: 9, name: "Home", icon: "house" },
        ],
      },
    ],
    byId: new Map([
      [7, { id: 7, name: "Groceries" }],
      [9, { id: 9, name: "Home" }],
    ]),
  }),
}))

vi.mock("@/features/onboarding/currency-assets", () => ({
  useCurrencyAssets: () => CURRENCIES,
}))

const { GroupEditor } = await import("./group-test-harness")
const { toGroupRow } = await import("../api")
const { toLookupIndex } = await import("../api")
const { assetPurchase, groupItem, lookupTables, regular } =
  await import("../api/fixtures")
const { renderTransactions, stubViewport, TEST_USER_ID } =
  await import("../review/test-harness")

const NOW = new Date("2026-07-31T12:00:00Z")

function groupRow(overrides: Record<string, unknown> = {}) {
  const item = {
    ...groupItem([regular(), assetPurchase()]),
    ...overrides,
  } as Parameters<typeof toGroupRow>[0]
  return toGroupRow(item, toLookupIndex(lookupTables))
}

async function renderEditor(
  props: Partial<Parameters<typeof GroupEditor>[0]> = {}
) {
  const group = groupRow()
  const result = await renderTransactions(
    <GroupEditor
      userId={TEST_USER_ID}
      group={group}
      open
      now={NOW}
      onOpenChange={() => {}}
      {...props}
    />
  )
  return { group, ...result }
}

function savedGroup() {
  const [variables] = updateMutate.mock.calls[0] as [{ group: unknown }]
  return variables.group as {
    description: string
    date: number
    category_id: number
    transactions: unknown[]
  }
}

beforeEach(() => {
  stubViewport(1440)
  toastAdd.mockReset()
  updateMutate.mockReset()
  updateState.error = null
  updateState.isPending = false
})

describe("GroupEditor", () => {
  it("seeds every field from the group and names the frame", async () => {
    await renderEditor()
    expect(screen.getByRole("heading", { name: "Edit group" })).toBeVisible()
    expect(screen.getByLabelText("Description")).toHaveValue("Weekly shop")
    expect(screen.getByLabelText("Date")).toHaveValue("31 Jul 2025")
    expect(screen.getByLabelText("Category")).toHaveValue("Groceries")
  })

  it("picks a category through the entity picker and keeps the children", async () => {
    const { group } = await renderEditor()

    await userEvent.click(screen.getByLabelText("Category"))
    await userEvent.click(await screen.findByRole("option", { name: /Home/ }))
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    const saved = savedGroup()
    expect(saved.category_id).toBe(9)
    expect(saved.transactions).toStrictEqual(group.raw.transactions)
  })

  it("sends every child back untouched when only the description is edited", async () => {
    const { group } = await renderEditor()

    await userEvent.clear(screen.getByLabelText("Description"))
    await userEvent.type(screen.getByLabelText("Description"), "Big shop")
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    expect(updateMutate).toHaveBeenCalledTimes(1)
    const saved = savedGroup()

    expect(saved.description).toBe("Big shop")
    expect(saved.date).toBe(group.raw.date)
    expect(saved.category_id).toBe(group.raw.category_id)

    expect(saved.transactions).toHaveLength(group.raw.transactions.length)
    expect(saved.transactions).toStrictEqual(group.raw.transactions)
    expect(saved.transactions).toBe(group.raw.transactions)
  })

  it("keeps every child id and entry id, so no child is recreated", async () => {
    const { group } = await renderEditor()

    await userEvent.clear(screen.getByLabelText("Description"))
    await userEvent.type(screen.getByLabelText("Description"), "Renamed")
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    const saved = savedGroup()
    expect(
      saved.transactions.map(
        (child) => (child as { transaction_id: string }).transaction_id
      )
    ).toEqual(group.raw.transactions.map((child) => child.transaction_id))
    expect(JSON.stringify(saved.transactions)).toBe(
      JSON.stringify(group.raw.transactions)
    )
  })

  it("carries the children across a date change too", async () => {
    const { group } = await renderEditor()

    await userEvent.clear(screen.getByLabelText("Date"))
    await userEvent.type(screen.getByLabelText("Date"), "2026-07-14")
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    const saved = savedGroup()
    expect(saved.date).not.toBe(group.raw.date)
    expect(saved.transactions).toStrictEqual(group.raw.transactions)
  })

  it("refuses an empty description before the server ever sees it", async () => {
    await renderEditor()
    await userEvent.clear(screen.getByLabelText("Description"))
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    expect(updateMutate).not.toHaveBeenCalled()
    expect(screen.getByText("A group needs a description.")).toBeVisible()
  })

  it("refuses a date it cannot read", async () => {
    await renderEditor()
    await userEvent.clear(screen.getByLabelText("Date"))
    await userEvent.type(screen.getByLabelText("Date"), "not a date")
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    expect(updateMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/could not be read/)).toBeVisible()
  })

  it("puts the group's own date apart from the children's dates", async () => {
    await renderEditor()
    expect(
      screen.getByText(/The group's own date, which is what it files under/)
    ).toBeVisible()
  })

  it("says the transactions are sent back exactly as they are", async () => {
    await renderEditor()
    const members = document.querySelector('[data-slot="group-editor-members"]')
    expect(members).not.toBeNull()
    expect(
      within(members as HTMLElement).getByText(
        /sends them back exactly as they are/
      )
    ).toBeVisible()
    expect(
      within(members as HTMLElement).getAllByRole("listitem")
    ).toHaveLength(2)
  })

  it("restores the group as it was when the toast's Undo is pressed", async () => {
    const { group } = await renderEditor()

    await userEvent.clear(screen.getByLabelText("Description"))
    await userEvent.type(screen.getByLabelText("Description"), "Renamed")
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    const [, options] = updateMutate.mock.calls[0] as [
      unknown,
      { onSuccess: () => void },
    ]
    options.onSuccess()

    const raised = toastAdd.mock.calls.at(-1)?.[0] as {
      title: string
      actionProps: { onClick: () => void }
    }
    expect(raised.title).toBe("Group saved")
    raised.actionProps.onClick()

    expect(updateMutate).toHaveBeenCalledTimes(2)
    const [restore] = updateMutate.mock.calls[1] as [{ group: unknown }]
    expect(restore.group).toStrictEqual(group.raw)
  })

  it("asks before discarding a typed change", async () => {
    const onOpenChange = vi.fn()
    await renderEditor({ onOpenChange })

    await userEvent.type(screen.getByLabelText("Description"), " extra")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText("Unsaved changes.")).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "Discard" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes without asking when nothing was typed", async () => {
    const onOpenChange = vi.fn()
    await renderEditor({ onOpenChange })
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("explains that a child-level rejection cannot name which child", async () => {
    updateState.error = normalizeHttpError({
      status: 422,
      data: {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors: [
          { field: "entry.amount", message: "Must be a positive value." },
        ],
      },
    })
    await renderEditor()
    await userEvent.clear(screen.getByLabelText("Description"))
    await userEvent.type(screen.getByLabelText("Description"), "Renamed")
    await userEvent.click(screen.getByRole("button", { name: "Save group" }))

    const banner = document.querySelector(
      '[data-slot="group-editor-form-error"]'
    )
    expect(banner?.textContent).toContain("Must be a positive value.")
    expect(banner?.textContent).toContain(
      "without saying which transaction it belongs to"
    )
  })
})
