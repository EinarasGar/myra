import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getTransactions = vi.fn()
const setVisibility = vi.fn()
const apiGet = vi.fn()
const deleteTransaction = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getTransactions,
  setVisibilityForMultipleTransactions: setVisibility,
  deleteAnExistingTransaction: deleteTransaction,
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

const {
  accountFees,
  cashDividend,
  combinedPage,
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} = await import("../api/fixtures")
const { ExploreScreen } = await import("./explore-screen")
const { useTransactionEditor } = await import("../editor")
const { useGrouping } = await import("../grouping")
const { UNAPPLIED_ONLY_FOOTNOTE } = await import("./copy")
const {
  createTestQueryClient,
  renderExplore,
  stubViewport,
  TEST_USER_ID,
  useSearchStub,
  VIEWPORTS,
} = await import("./test-harness")

type Search = Parameters<typeof ExploreScreen>[0]["search"]

const onPatch = vi.fn()

const ITEMS = [
  individualItem(regular()),
  individualItem(cashDividend()),
  individualItem(accountFees()),
  individualItem(ghostTransfer()),
  groupItem([regular({ transaction_id: "tx-a" }), accountFees()]),
]

async function renderScreen(
  initial: Search = {},
  queryClient = createTestQueryClient()
) {
  function ExploreHost() {
    const stub = useSearchStub(initial, onPatch)
    return (
      <ExploreScreen
        search={stub.search}
        onPatch={stub.onPatch}
        editor={useTransactionEditor()}
        grouping={useGrouping(TEST_USER_ID)}
      />
    )
  }
  const result = await renderExplore(<ExploreHost />, queryClient)
  return { ...result, queryClient }
}

function drawer() {
  return screen.getByRole("dialog")
}

async function openFirstRow() {
  await waitFor(() => {
    expect(
      document.querySelectorAll('[data-slot="ledger-row"]').length
    ).toBeGreaterThan(0)
  })
  const row = document.querySelector<HTMLElement>(
    '[data-slot="ledger-row"]:not([data-group="true"])'
  )
  fireEvent.click(row as HTMLElement)
  return screen.findByRole("dialog")
}

beforeEach(() => {
  onPatch.mockReset()
  getTransactions.mockReset()
  getTransactions.mockResolvedValue({ data: combinedPage(ITEMS) })
  setVisibility.mockReset()
  setVisibility.mockResolvedValue({ data: {} })
  apiGet.mockReset()
  apiGet.mockResolvedValue({
    data: { transaction: regular(), lookup_tables: lookupTables },
  })
  deleteTransaction.mockReset()
  deleteTransaction.mockResolvedValue({ data: {} })
  stubViewport(VIEWPORTS.full)
})

afterEach(cleanup)

describe("while the ledger is loading", () => {
  it("shows a static skeleton and never a spinner above the fold", async () => {
    getTransactions.mockReturnValue(new Promise(() => undefined))
    await renderScreen()
    expect(
      screen.getAllByRole("status").map((node) => node.textContent)
    ).toContain("Loading transactions")
    expect(document.querySelectorAll(".animate-spin")).toHaveLength(0)
  })
})

describe("when the ledger fails", () => {
  it("keeps the query bar, drops the slice it cannot answer, and offers a retry", async () => {
    getTransactions.mockRejectedValue(new Error("nope"))
    await renderScreen()
    await screen.findByRole("alert")
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument()
    expect(document.querySelector('[data-slot="query-bar"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="slice-panel"]')).toBeNull()
  })
})

describe("when there is nothing to show", () => {
  it("distinguishes an empty ledger from an empty filter", async () => {
    getTransactions.mockResolvedValue({ data: combinedPage([]) })
    await renderScreen()
    await screen.findByText("Nothing in the ledger yet")

    cleanup()
    await renderScreen({ q: "nothing" })
    await screen.findByText("No transactions match this filter")

    cleanup()
    await renderScreen({ from: "2026-07-01" })
    await screen.findByText("Nothing in the ledger yet")
    expect(
      document.querySelector('[data-slot="ledger-empty"]')
    ).toHaveAttribute("data-unapplied", "true")
    expect(screen.getByText(UNAPPLIED_ONLY_FOOTNOTE)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull()
  })

  it("still blames the filter when an applied token rides with an unapplied one", async () => {
    getTransactions.mockResolvedValue({ data: combinedPage([]) })
    await renderScreen({ q: "nothing", from: "2026-07-01" })
    await screen.findByText("No transactions match this filter")
  })

  it("clears every filter dimension from the filtered-empty state", async () => {
    getTransactions.mockResolvedValue({ data: combinedPage([]) })
    await renderScreen({ q: "nothing" })
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear filters" })
    )
    expect(onPatch).toHaveBeenCalledWith(
      expect.objectContaining({ q: undefined, account: undefined })
    )
  })
})

describe("with rows on screen", () => {
  it("draws the ledger, the loaded slice and the group-by control", async () => {
    await renderScreen()
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="ledger-row"]').length
      ).toBeGreaterThan(0)
    })
    expect(document.querySelector('[data-slot="group-by-bar"]')).not.toBeNull()
    expect(screen.getByText("Loaded so far")).toBeInTheDocument()
  })

  it("invents nothing anywhere on the screen", async () => {
    await renderScreen()
    await screen.findByText("Loaded so far")
    expect(document.querySelectorAll("[data-mock]")).toHaveLength(0)
    expect(document.querySelectorAll('[data-slot="mock-badge"]')).toHaveLength(
      0
    )
  })

  it("keeps the ledger unmarked, because the rows are real", async () => {
    await renderScreen()
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="ledger-row"]').length
      ).toBeGreaterThan(0)
    })
    expect(
      document.querySelector('[data-slot="ledger-panel"] [data-mock]')
    ).toBeNull()
  })

  it("states what the totals below it cover", async () => {
    await renderScreen()
    const footnote = await waitFor(() => {
      const node = document.querySelector(
        '[data-slot="ledger-panel"] [data-slot="panel-footnote"]'
      )
      expect(node).not.toBeNull()
      return node
    })
    expect(footnote?.textContent).toContain(
      "Every transaction in this view is loaded"
    )
    expect(footnote?.textContent).toContain("nothing is ever added across them")
  })
})

describe("the detail drawer", () => {
  it("opens from a ledger row and leaves the ledger standing behind it", async () => {
    await renderScreen()
    await openFirstRow()
    expect(within(drawer()).getByText("Tesco")).toBeInTheDocument()
    expect(
      document.querySelectorAll('[data-slot="ledger-row"]').length
    ).toBeGreaterThan(0)
  })

  it("steps through the rows the ledger is currently showing", async () => {
    await renderScreen()
    await openFirstRow()
    expect(
      document.querySelector('[data-slot="drawer-stepper"]')?.textContent
    ).toContain("1 / 4")
    expect(
      screen.getByRole("button", { name: "Previous transaction" })
    ).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="drawer-stepper"]')?.textContent
      ).toContain("2 / 4")
    })
  })

  it("steps with j as well as the arrows", async () => {
    await renderScreen()
    await openFirstRow()
    fireEvent.keyDown(
      document.querySelector('[data-slot="drawer-body"]') as HTMLElement,
      { key: "j" }
    )
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="drawer-stepper"]')?.textContent
      ).toContain("2 / 4")
    })
  })

  it("counts only what is on screen, not a collapsed group's children", async () => {
    await renderScreen()
    await openFirstRow()
    expect(
      document.querySelector('[data-slot="drawer-stepper"]')?.textContent
    ).toContain("/ 4")
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })

    fireEvent.click(screen.getByRole("button", { name: /Expand Weekly shop/ }))
    await openFirstRow()
    expect(
      document.querySelector('[data-slot="drawer-stepper"]')?.textContent
    ).toContain("/ 6")
  })

  it("keeps its place across a refetch", async () => {
    const { queryClient } = await renderScreen()
    await openFirstRow()
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="drawer-stepper"]')?.textContent
      ).toContain("2 / 4")
    })

    await queryClient.refetchQueries()
    await waitFor(() => {
      expect(getTransactions.mock.calls.length).toBeGreaterThan(1)
    })
    expect(
      document.querySelector('[data-slot="drawer-stepper"]')?.textContent
    ).toContain("2 / 4")
  })

  it("lands on the row that took the deleted one's place", async () => {
    await renderScreen()
    const panel = await openFirstRow()
    getTransactions.mockResolvedValue({ data: combinedPage(ITEMS.slice(1)) })

    fireEvent.click(within(panel).getByRole("button", { name: "Delete" }))
    fireEvent.click(
      await within(panel).findByRole("button", { name: "Delete" })
    )

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="drawer-stepper"]')?.textContent
      ).toContain("1 / 3")
    })
    expect(within(drawer()).queryByText("Tesco")).toBeNull()
  })

  it("returns to the row a rolled-back delete brought back", async () => {
    await renderScreen()
    const panel = await openFirstRow()
    deleteTransaction.mockRejectedValue(new Error("nope"))

    fireEvent.click(within(panel).getByRole("button", { name: "Delete" }))
    fireEvent.click(
      await within(panel).findByRole("button", { name: "Delete" })
    )

    await waitFor(() => {
      expect(deleteTransaction).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="drawer-stepper"]')?.textContent
      ).toContain("1 / 4")
    })
    expect(within(drawer()).getByText("Tesco")).toBeInTheDocument()
  })

  it("closes on request", async () => {
    await renderScreen()
    await openFirstRow()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })
})

describe("selecting rows", () => {
  it("floats the bulk actions rather than moving the rows", async () => {
    await renderScreen()
    const checkbox = await screen.findByRole("checkbox", {
      name: /Select Tesco/,
    })
    expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull()

    fireEvent.click(checkbox)
    const bar = await screen.findByRole("region", { name: "Bulk actions" })
    expect(bar.parentElement?.className).toContain("fixed")
    expect(bar.parentElement?.className).toContain("pointer-events-none")
  })

  it("does not open the drawer when a row is selected", async () => {
    await renderScreen()
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Select Tesco/ })
    )
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("only offers Mark reviewed when something in the selection is unreviewed", async () => {
    await renderScreen()
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Select Tesco/ })
    )
    const bar = within(
      await screen.findByRole("region", { name: "Bulk actions" })
    )
    expect(bar.getByRole("button", { name: "Mark reviewed" })).toBeDisabled()

    fireEvent.click(screen.getByRole("checkbox", { name: /Select Money in/ }))
    expect(
      bar.getByRole("button", { name: "Mark reviewed" })
    ).not.toBeDisabled()
  })

  it("hides what it can and leaves an unreviewed row in the queue", async () => {
    await renderScreen()
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Select Tesco/ })
    )
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Money in/ }))

    const bar = within(screen.getByRole("region", { name: "Bulk actions" }))
    const hide = bar.getByRole("button", { name: "Hide" })
    expect(hide).not.toBeDisabled()
    expect(bar.getByText(/1 selected row will not change/)).toBeInTheDocument()

    fireEvent.click(hide)
    await waitFor(() => {
      expect(setVisibility).toHaveBeenCalledTimes(1)
    })
    expect(setVisibility).toHaveBeenCalledWith(expect.anything(), {
      transaction_ids: ["tx-regular"],
      visibility: "hidden",
    })
  })

  it("refuses a bulk hide that would erase the unreviewed flag", async () => {
    await renderScreen()
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Select Money in/ })
    )

    const bar = within(screen.getByRole("region", { name: "Bulk actions" }))
    const hide = bar.getByRole("button", { name: "Hide" })
    expect(hide).toBeDisabled()
    expect(
      bar.getByText(/cannot be hidden|Mark it reviewed first/)
    ).toBeInTheDocument()

    fireEvent.click(hide)
    expect(setVisibility).not.toHaveBeenCalled()
  })

  it("asks before deleting", async () => {
    await renderScreen()
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Select Tesco/ })
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(await screen.findByText(/It cannot be undone/)).toBeInTheDocument()
  })
})

describe("grouping", () => {
  it("refuses merchant and still shows the ledger in day order", async () => {
    await renderScreen({ group: "merchant" })
    await screen.findByText("Sverto cannot group by merchant")
    expect(screen.getByText(/no merchant field/)).toBeInTheDocument()
    expect(
      document.querySelectorAll('[data-slot="ledger-row"]').length
    ).toBeGreaterThan(0)
  })

  it("switches grouping through the URL, not local state", async () => {
    await renderScreen()
    fireEvent.click(await screen.findByRole("button", { name: "Account" }))
    expect(onPatch).toHaveBeenCalledWith({ group: "account" })
  })
})

describe("a filter the server cannot run", () => {
  it("shows the rows unfiltered and says the token is not applied", async () => {
    await renderScreen({ from: "2026-07-01", to: "2026-07-02" })
    await waitFor(() => {
      expect(document.querySelectorAll('[data-slot="ledger-row"]').length).toBe(
        5
      )
    })
    expect(
      document
        .querySelector('[data-token="dateFrom"]')
        ?.getAttribute("data-applied")
    ).toBe("false")
    expect(getTransactions).toHaveBeenCalledTimes(1)
  })
})
