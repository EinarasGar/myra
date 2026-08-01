import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SHELL_WIDTHS, type ShellWidth } from "@/components/layout/breakpoints"
import {
  columnTrackCount,
  normalizeColumnTemplate,
} from "@/components/primitives"

import type { LedgerRow } from "../api"
import { toLedgerRows, toLookupIndex } from "../api"
import {
  accountFees,
  cashDividend,
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} from "../api/fixtures"

import { LedgerTable } from "./ledger-table"
import type { GroupByMode } from "./pivot"
import { pivotRows } from "./pivot"
import { LEDGER_COLUMNS, ledgerBanding, ledgerColumns } from "./presentation"
import type { LedgerSelection } from "./selection"
import { renderExplore, stubViewport, VIEWPORTS } from "./test-harness"

function rows(): LedgerRow[] {
  return toLedgerRows(
    [
      individualItem(regular()),
      individualItem(cashDividend()),
      individualItem(accountFees()),
      individualItem(ghostTransfer()),
      groupItem([regular({ transaction_id: "tx-a" }), accountFees()]),
    ],
    toLookupIndex(lookupTables)
  )
}

function selection(selected: string[] = []): LedgerSelection {
  const ids = new Set(selected)
  return {
    ids,
    isSelected: (rowId) => ids.has(rowId),
    toggle: vi.fn(),
    setMany: vi.fn(),
    clear: vi.fn(),
  }
}

const markReviewed = vi.fn()
const loadMore = vi.fn()
const openTransaction = vi.fn()
const openGroup = vi.fn()
const toggleExpanded = vi.fn()

async function renderTable(
  width: ShellWidth,
  overrides: {
    mode?: GroupByMode
    hasNextPage?: boolean
    totalResults?: number
    selected?: string[]
    isFetchingNextPage?: boolean
    expanded?: string[]
  } = {}
) {
  stubViewport(VIEWPORTS[width])
  const all = rows()
  const mode = overrides.mode ?? "day"
  return renderExplore(
    <LedgerTable
      pivot={pivotRows(all, mode)}
      columns={ledgerColumns(width, ledgerBanding(mode))}
      selection={selection(overrides.selected)}
      categoryName={(category) => category.name}
      onMarkReviewed={markReviewed}
      onOpenTransaction={openTransaction}
      onOpenGroup={openGroup}
      expanded={new Set(overrides.expanded ?? [])}
      onToggleExpanded={toggleExpanded}
      loadedCount={all.length}
      totalResults={overrides.totalResults}
      hasNextPage={overrides.hasNextPage ?? false}
      isFetchingNextPage={overrides.isFetchingNextPage ?? false}
      onLoadMore={loadMore}
    />
  )
}

function dataRows(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="ledger-row"]')
  )
}

const GROUP_ROW_ID = "group-1"

beforeEach(() => {
  markReviewed.mockReset()
  loadMore.mockReset()
  openTransaction.mockReset()
  openGroup.mockReset()
  toggleExpanded.mockReset()
  stubViewport(VIEWPORTS.full)
})

afterEach(cleanup)

const BANDED = (["day", "category"] as const).flatMap((mode) =>
  SHELL_WIDTHS.map((width) => [mode, width] as const)
)

describe("the ledger grid at every width", () => {
  it.each(BANDED)(
    "renders one cell per track on every %s row at %s",
    async (mode, width) => {
      await renderTable(width, { mode })
      const tracks = columnTrackCount(
        normalizeColumnTemplate(LEDGER_COLUMNS[ledgerBanding(mode)][width])
      )
      const counts = dataRows().map((row) => row.childElementCount)
      expect(counts.length).toBeGreaterThan(0)
      for (const count of counts) expect(count).toBe(tracks)

      const header = document.querySelector("thead tr")
      expect(header?.childElementCount).toBe(tracks)
    }
  )

  it.each(BANDED)(
    "keeps an expanded group's children on the %s grid at %s",
    async (mode, width) => {
      await renderTable(width, { mode, expanded: [GROUP_ROW_ID] })
      const tracks = columnTrackCount(
        normalizeColumnTemplate(LEDGER_COLUMNS[ledgerBanding(mode)][width])
      )
      const children = Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="ledger-child-row"]')
      )
      expect(children.length).toBeGreaterThan(0)
      for (const child of children) {
        expect(child.childElementCount).toBe(tracks)
      }
    }
  )

  it("drops the type column first and the selection last", async () => {
    await renderTable("tight")
    expect(screen.queryByText("Type")).toBeNull()
    expect(screen.getByText("Category")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /Select every loaded/ })
    ).toBeInTheDocument()

    cleanup()
    await renderTable("phone")
    expect(
      screen.queryByRole("checkbox", { name: /Select every loaded/ })
    ).toBeNull()
    expect(screen.getByText("Amount")).toBeInTheDocument()
  })

  it("prints no Date column while the day band already carries the date", async () => {
    await renderTable("full", { mode: "day" })
    expect(screen.queryByText("Date")).toBeNull()
  })

  it("adds the Date column once the bands stop being days", async () => {
    await renderTable("full", { mode: "category" })
    expect(screen.getByText("Date")).toBeInTheDocument()
  })
})

describe("opening a transaction", () => {
  it("hands the row's transaction id to the drawer on click", async () => {
    await renderTable("full")
    const row = dataRows().find(
      (candidate) => candidate.dataset["group"] !== "true"
    )
    fireEvent.click(row as HTMLElement)
    expect(openTransaction).toHaveBeenCalledTimes(1)
  })

  it("opens on Enter, so the ledger is walkable without a mouse", async () => {
    await renderTable("full")
    const row = dataRows().find(
      (candidate) => candidate.dataset["group"] !== "true"
    )
    expect(row).toHaveAttribute("tabindex", "0")
    fireEvent.keyDown(row as HTMLElement, { key: "Enter" })
    expect(openTransaction).toHaveBeenCalledTimes(1)
  })

  it("leaves the checkbox and the inline action to themselves", async () => {
    await renderTable("full")
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Tesco/ }))
    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }))
    expect(openTransaction).not.toHaveBeenCalled()
    expect(markReviewed).toHaveBeenCalledWith(["tx-ghost"])
  })

  it("opens a child of an expanded group", async () => {
    await renderTable("full", { expanded: [GROUP_ROW_ID] })
    const child = document.querySelector('[data-slot="ledger-child-row"]')
    fireEvent.click(child as HTMLElement)
    expect(openTransaction).toHaveBeenCalledTimes(1)
  })
})

describe("an unreviewed row", () => {
  it("carries the band, the chip and its own way out", async () => {
    await renderTable("full")
    const ghost = dataRows().find((row) => row.dataset["variant"] === "ghost")
    expect(ghost).toBeDefined()
    expect(ghost?.querySelector('[data-slot="status-chip"]')?.textContent).toBe(
      "Unreviewed"
    )

    const action = screen.getByRole("button", { name: "Mark reviewed" })
    fireEvent.click(action)
    expect(markReviewed).toHaveBeenCalledWith(["tx-ghost"])
  })

  it("stays selectable, because a ghost row is still a row", async () => {
    await renderTable("full")
    expect(
      screen.getByRole("checkbox", { name: /Select Money in/ })
    ).toBeInTheDocument()
  })

  it("keeps its type glyph, ghosted, so triage still shows what the row is", async () => {
    await renderTable("full")
    const ghost = dataRows().find((row) => row.dataset["variant"] === "ghost")
    const glyph = ghost?.querySelector('[data-slot="row-glyph"]')
    expect(glyph?.querySelector("svg")).not.toBeNull()
    expect(glyph).toHaveClass("text-ghost")
  })
})

function groupRow(): HTMLElement {
  return dataRows().find(
    (row) => row.dataset["group"] === "true"
  ) as HTMLElement
}

function disclosure(): HTMLElement {
  return document.querySelector('[data-slot="group-disclosure"]') as HTMLElement
}

describe("a group row's two targets", () => {
  it("opens the group in the drawer when the row itself is clicked", async () => {
    await renderTable("full")
    fireEvent.click(groupRow())
    expect(openGroup).toHaveBeenCalledWith("group-1")
    expect(toggleExpanded).not.toHaveBeenCalled()
  })

  it("opens the group on Enter, so the drawer is reachable without a mouse", async () => {
    await renderTable("full")
    const row = groupRow()
    expect(row).toHaveAttribute("tabindex", "0")
    fireEvent.keyDown(row, { key: "Enter" })
    expect(openGroup).toHaveBeenCalledWith("group-1")
    expect(toggleExpanded).not.toHaveBeenCalled()
  })

  it("expands from the disclosure without opening the drawer", async () => {
    await renderTable("full")
    fireEvent.click(screen.getByRole("button", { name: "Expand Weekly shop" }))
    expect(toggleExpanded).toHaveBeenCalledTimes(1)
    expect(openGroup).not.toHaveBeenCalled()
    expect(openTransaction).not.toHaveBeenCalled()
  })

  it("names the disclosure for what pressing it will do", async () => {
    await renderTable("full")
    expect(disclosure()).toHaveAttribute("aria-expanded", "false")
    expect(groupRow()).toHaveAttribute("aria-expanded", "false")

    cleanup()
    await renderTable("full", { expanded: [GROUP_ROW_ID] })
    expect(
      screen.getByRole("button", { name: "Collapse Weekly shop" })
    ).toHaveAttribute("aria-expanded", "true")
    expect(groupRow()).toHaveAttribute("aria-expanded", "true")
  })

  it("gives the disclosure the whole glyph cell and a 44px target", async () => {
    await renderTable("full")
    const button = disclosure()
    expect(button).toHaveClass("h-full", "w-full")
    expect(button).toHaveClass("after:size-11")
  })

  it("expands with Right and collapses with Left, as a treegrid row does", async () => {
    await renderTable("full")
    fireEvent.keyDown(groupRow(), { key: "ArrowRight" })
    expect(toggleExpanded).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(groupRow(), { key: "ArrowLeft" })
    expect(toggleExpanded).toHaveBeenCalledTimes(1)

    cleanup()
    toggleExpanded.mockReset()
    await renderTable("full", { expanded: [GROUP_ROW_ID] })
    fireEvent.keyDown(groupRow(), { key: "ArrowRight" })
    expect(toggleExpanded).not.toHaveBeenCalled()
    fireEvent.keyDown(groupRow(), { key: "ArrowLeft" })
    expect(toggleExpanded).toHaveBeenCalledTimes(1)
    expect(openGroup).not.toHaveBeenCalled()
  })

  it("leaves the checkbox to itself", async () => {
    await renderTable("full")
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Select Weekly shop/ })
    )
    expect(openGroup).not.toHaveBeenCalled()
    expect(toggleExpanded).not.toHaveBeenCalled()
  })
})

describe("a group row", () => {
  it("shows its child count and hides its children until asked", async () => {
    await renderTable("full")
    expect(
      document.querySelectorAll('[data-slot="ledger-child-row"]')
    ).toHaveLength(0)
    expect(screen.getByText("Group")).toBeInTheDocument()

    cleanup()
    await renderTable("full", { expanded: [GROUP_ROW_ID] })
    expect(
      document.querySelectorAll('[data-slot="ledger-child-row"]')
    ).toHaveLength(2)
  })

  it.each(SHELL_WIDTHS)(
    "keeps the seam and adds each child's own glyph at %s",
    async (width) => {
      await renderTable(width, { expanded: [GROUP_ROW_ID] })
      const children = Array.from(
        document.querySelectorAll('[data-slot="ledger-child-row"]')
      )
      expect(children).toHaveLength(2)
      for (const child of children) {
        expect(child.querySelector('[data-slot="child-seam"]')).not.toBeNull()
        const glyph = child.querySelector('[data-slot="row-glyph"]')
        expect(glyph?.querySelector("svg")).not.toBeNull()
      }
    }
  )

  it("names a child's glyph by its category, falling back to its type", async () => {
    await renderTable("full", { expanded: [GROUP_ROW_ID] })
    const children = Array.from(
      document.querySelectorAll('[data-slot="ledger-child-row"]')
    )
    const labels = children.map(
      (child) =>
        child.querySelector('[data-slot="row-glyph"] .sr-only')?.textContent
    )
    expect(labels).toEqual(["Groceries · Purchase", "Account fee"])
  })

  it("gives children no checkbox of their own", async () => {
    await renderTable("full", { expanded: [GROUP_ROW_ID] })
    const children = document.querySelectorAll('[data-slot="ledger-child-row"]')
    for (const child of children) {
      expect(child.querySelectorAll('[data-slot="checkbox"]')).toHaveLength(0)
    }
  })
})

describe("day bands", () => {
  it("prints the day's net when the day is fully loaded", async () => {
    await renderTable("full")
    const band = document.querySelector('[data-slot="day-band"]')
    expect(band?.textContent).toContain("£")
  })

  it("withholds the last day's net while more of it is still to load", async () => {
    await renderTable("full", { hasNextPage: true, totalResults: 40 })
    const bands = Array.from(
      document.querySelectorAll('[data-slot="day-band"]')
    )
    const last = bands[bands.length - 1]
    expect(last?.textContent).toContain("still loading this day")
  })

  it("carries a share bar only when the pivot can compare groups", async () => {
    await renderTable("full", { mode: "type" })
    expect(
      document.querySelectorAll('[data-slot="share-bar"]').length
    ).toBeGreaterThan(0)

    cleanup()
    await renderTable("full", { mode: "day" })
    expect(document.querySelectorAll('[data-slot="share-bar"]')).toHaveLength(0)
  })
})

describe("a pivot subtotal over a half-loaded ledger", () => {
  it("draws no share bar, because the ranking can still change", async () => {
    await renderTable("full", {
      mode: "type",
      hasNextPage: true,
      totalResults: 400,
    })
    expect(document.querySelectorAll('[data-slot="share-bar"]')).toHaveLength(0)
  })

  it("says on every band how many rows the subtotal covers", async () => {
    await renderTable("full", {
      mode: "type",
      hasNextPage: true,
      totalResults: 400,
    })
    const bands = Array.from(
      document.querySelectorAll('[data-slot="day-band"]')
    )
    expect(bands.length).toBeGreaterThan(0)
    for (const band of bands) {
      expect(band.getAttribute("data-scope")).toBe("partial")
      expect(band.textContent).toContain("over the")
      expect(band.textContent).toContain("loaded")
    }
  })

  it("restores the bars once the whole slice is in", async () => {
    await renderTable("full", { mode: "type", totalResults: 5 })
    expect(
      document.querySelectorAll('[data-slot="share-bar"]').length
    ).toBeGreaterThan(0)
    expect(document.querySelector('[data-slot="band-scope"]')).toBeNull()
  })
})

describe("paging", () => {
  it("never promises to load the whole ledger from one control", async () => {
    await renderTable("full", { hasNextPage: true, totalResults: 2542 })
    expect(screen.queryByText(/Show all/)).toBeNull()
    const button = screen.getByRole("button", { name: /Load more rows/ })
    expect(button.textContent).toContain("2,542")
    expect(button.textContent).toContain("loaded")
  })

  it("loads the next page from the footer control", async () => {
    await renderTable("full", { hasNextPage: true, totalResults: 40 })
    fireEvent.click(screen.getByRole("button", { name: /Load more rows/ }))
    expect(loadMore).toHaveBeenCalledTimes(1)
  })

  it("names only what is loaded when the server did not say how many there are", async () => {
    await renderTable("full", { hasNextPage: true })
    const button = screen.getByRole("button", { name: /Load more rows/ })
    expect(button.textContent).toContain("loaded")
    expect(button.textContent).not.toContain(" of ")
  })

  it("keeps a reachable control at the mandated hit size", async () => {
    await renderTable("full", { hasNextPage: true, totalResults: 40 })
    const button = screen.getByRole("button", { name: /Load more rows/ })
    expect(button).toHaveClass("min-h-[44px]")
    expect(button.tabIndex).toBe(0)
  })

  it("shows no control and no spinner once everything is loaded", async () => {
    await renderTable("full", { totalResults: 5 })
    expect(screen.queryByRole("button", { name: /Load more/ })).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("spins in the footer while the next page is in flight", async () => {
    await renderTable("full", {
      hasNextPage: true,
      totalResults: 40,
      isFetchingNextPage: true,
    })
    expect(screen.getByRole("status")).toHaveTextContent("Loading more…")
  })

  it("puts a scroll sentinel in the footer so the list loads itself", async () => {
    await renderTable("full", { hasNextPage: true, totalResults: 40 })
    expect(
      document.querySelector('[data-slot="load-more-sentinel"]')
    ).not.toBeNull()
  })
})

describe("the row glyph", () => {
  it("names the category, not just the type, when the row carries one", async () => {
    await renderTable("full")

    const groceries = await screen.findByText("Groceries · Purchase")
    expect(groceries).toBeInTheDocument()
  })

  it("falls back to the type for the twelve types that carry no category", async () => {
    await renderTable("full")

    expect(screen.getAllByText("Account fee").length).toBeGreaterThan(0)
    expect(screen.queryByText(/· Account fee$/)).toBeNull()
  })
})
