import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RequiredIdentifiableTransaction } from "@/api"

const toastAdd = vi.fn()
vi.mock("@/components/ui/toast", () => ({
  toast: { add: toastAdd, close: vi.fn(), update: vi.fn(), promise: vi.fn() },
}))

const deleteGroupMutate = vi.fn()

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  useDeleteTransactionGroup: () => ({
    mutate: deleteGroupMutate as unknown,
    isPending: false,
  }),
}))

const { GroupDrawer } = await import("./group-test-harness")
const { toGroupRow, toLookupIndex } = await import("../api")
const { ACCOUNT_CURRENT, ASSET_USD, entry, groupItem, lookupTables, regular } =
  await import("../api/fixtures")
const { renderTransactions, stubViewport, TEST_USER_ID } =
  await import("../review/test-harness")

function groupRow(children: RequiredIdentifiableTransaction[]) {
  return toGroupRow(
    groupItem(children) as Parameters<typeof toGroupRow>[0],
    toLookupIndex(lookupTables)
  )
}

const TWO_GBP: RequiredIdentifiableTransaction[] = [
  regular(),
  regular({
    transaction_id: "tx-regular-2",
    description: "Aldi",
    entry: entry(ACCOUNT_CURRENT, 1, -18.5),
  }),
]

const MIXED: RequiredIdentifiableTransaction[] = [
  regular(),
  regular({
    transaction_id: "tx-usd",
    description: "Amazon US",
    entry: entry(ACCOUNT_CURRENT, ASSET_USD, -30),
  }),
]

async function renderGroup(
  props: Partial<Parameters<typeof GroupDrawer>[0]> = {},
  children: RequiredIdentifiableTransaction[] = TWO_GBP
) {
  const group = groupRow(children)
  const result = await renderTransactions(
    <GroupDrawer
      userId={TEST_USER_ID}
      group={group}
      open
      onOpenChange={() => {}}
      {...props}
    />
  )
  return { group, ...result }
}

beforeEach(() => {
  stubViewport(1440)
  toastAdd.mockReset()
  deleteGroupMutate.mockReset()
})

describe("GroupDrawer", () => {
  it("names the group in the header under a Group eyebrow", async () => {
    await renderGroup()
    expect(screen.getAllByText("Group").length).toBeGreaterThan(0)
    expect(
      document.querySelector('[data-slot="group-type-chip"]')?.textContent
    ).toBe("Group")
    expect(
      screen.getByRole("heading", { name: "Weekly shop" })
    ).toBeInTheDocument()
  })

  it("states the child count and the category", async () => {
    await renderGroup()
    const hero = document.querySelector('[data-slot="group-drawer-hero"]')
    expect(hero?.textContent).toContain("2")
    expect(hero?.textContent).toContain("2 transactions")
    expect(hero?.textContent).toContain("Groceries")
  })

  it("lists every child with its own amount", async () => {
    await renderGroup()
    const children = document.querySelector(
      '[data-slot="group-drawer-children"]'
    )
    expect(children).not.toBeNull()
    const list = within(children as HTMLElement)
    expect(list.getAllByRole("listitem")).toHaveLength(2)
    expect(list.getByText("Tesco")).toBeVisible()
    expect(list.getByText("Aldi")).toBeVisible()
    expect(list.getByText("−£42.18")).toBeVisible()
    expect(list.getByText("−£18.50")).toBeVisible()
  })

  it("shows one figure per currency and never a combined total", async () => {
    await renderGroup({}, MIXED)
    const hero = document.querySelector('[data-slot="group-drawer-hero"]')
    const figures = within(hero as HTMLElement)
    expect(figures.getByText("−£42.18")).toBeVisible()
    expect(figures.getByText("−$30.00")).toBeVisible()

    const details = document.querySelector('[data-slot="group-drawer-details"]')
    const net = within(details as HTMLElement)
    expect(net.getByText("−£42.18")).toBeVisible()
    expect(net.getByText("−$30.00")).toBeVisible()
    expect(
      screen.getByText(/a group spanning two currencies shows two figures/)
    ).toBeVisible()
  })

  it("says the group date is the group's own, apart from the children's", async () => {
    await renderGroup()
    const details = document.querySelector('[data-slot="group-drawer-details"]')
    expect(within(details as HTMLElement).getByText("Group date")).toBeVisible()
    expect(
      screen.getByText(
        /The transactions inside keep the dates they already had/
      )
    ).toBeVisible()
  })

  it("offers no raw response disclosure", async () => {
    await renderGroup()
    expect(screen.queryByRole("button", { name: /Raw response/ })).toBeNull()
    expect(screen.queryByText(/"group_id"/)).toBeNull()
  })

  it("blocks Edit with a stated reason until a caller wires it", async () => {
    await renderGroup({ onEdit: undefined })
    const edit = screen.getByRole("button", { name: "Edit" })
    expect(edit).toBeDisabled()
    expect(edit).toHaveAttribute(
      "title",
      expect.stringContaining("not available from this panel")
    )
  })

  it("opens the editor from the Edit button", async () => {
    const onEdit = vi.fn()
    await renderGroup({ onEdit })
    await userEvent.click(screen.getByRole("button", { name: "Edit" }))
    expect(onEdit).toHaveBeenCalled()
  })

  it("opens a child transaction when a caller wires it", async () => {
    const onOpenChild = vi.fn()
    await renderGroup({ onOpenChild })
    await userEvent.click(screen.getByRole("button", { name: "Open Tesco" }))
    expect(onOpenChild).toHaveBeenCalledWith("tx-regular")
  })

  it("moves a child out of the group through the caller's seam", async () => {
    const onRemoveChild = vi.fn()
    const { group } = await renderGroup({ onRemoveChild })
    const children = document.querySelector(
      '[data-slot="group-drawer-children"]'
    )
    const [remove] = within(children as HTMLElement).getAllByRole("button", {
      name: "Remove",
    })
    await userEvent.click(remove as HTMLElement)
    expect(onRemoveChild).toHaveBeenCalledWith("tx-regular", group)
  })

  it("offers no Remove when no caller can rewrite the membership", async () => {
    await renderGroup()
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull()
  })

  it("names what a delete takes with it and only writes on the second press", async () => {
    const { group } = await renderGroup()
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(deleteGroupMutate).not.toHaveBeenCalled()
    expect(
      screen.getByText("Delete the group and the 2 transactions inside it?")
    ).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(deleteGroupMutate).toHaveBeenCalledWith(
      { groupId: group.groupId },
      expect.anything()
    )
  })

  it("shows a skeleton rather than an empty panel with no group yet", async () => {
    await renderGroup({ group: null })
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy")
  })
})
